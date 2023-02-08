import chalk from 'chalk'

import { Writer } from '../../../generation/ts-builders/Writer'
import { JsArgs } from '../types/JsApi'
import { ValidationError } from '../types/ValidationError'
import { applyValidationError } from './applyValidationError'
import { buildArgumentsRenderingTree } from './ArgumentsRenderingTree'

const renderError = (error: ValidationError, args: JsArgs) => {
  const argsTree = buildArgumentsRenderingTree(args)
  applyValidationError(error, argsTree)

  const disabledChalk = new chalk.Instance({ level: 0 })
  const context = { chalk: disabledChalk }
  const argsStr = new Writer(0, context).write(argsTree).toString()
  const message = argsTree.renderAllMessages(disabledChalk)

  return `${argsStr}\n\n${message}`
}

const PostOutputDescription = {
  name: 'Post',
  fields: [
    { name: 'id', typeName: 'string', isRelation: false },
    { name: 'title', typeName: 'string', isRelation: false },
    { name: 'comments', typeName: 'Comment', isRelation: true },
  ],
}

describe('includeAndSelect', () => {
  test('top level', () => {
    expect(
      renderError(
        { kind: 'includeAndSelect', selectionPath: [] },
        {
          data: { foo: 'bar' },
          include: {},
          select: {},
        },
      ),
    ).toMatchInlineSnapshot(`
      {
        data: {
          foo: "bar"
        },
        include: {},
        ~~~~~~~
        select: {}
        ~~~~~~
      }

      Please either use \`include\` or \`select\`, but not both at the same time.
    `)
  })

  test('deep', () => {
    expect(
      renderError(
        { kind: 'includeAndSelect', selectionPath: ['posts', 'likes'] },
        {
          include: {
            posts: {
              where: { published: true },
              select: {
                likes: {
                  select: {},
                  include: {},
                },
              },
            },
          },
        },
      ),
    ).toMatchInlineSnapshot(`
      {
        include: {
          posts: {
            where: {
              published: true
            },
            select: {
              likes: {
                select: {},
                ~~~~~~
                include: {}
                ~~~~~~~
              }
            }
          }
        }
      }

      Please either use \`include\` or \`select\`, but not both at the same time.
    `)
  })
})

describe('includeOnScalar', () => {
  test('top level - no type description', () => {
    expect(
      renderError(
        { kind: 'includeOnScalar', selectionPath: ['id'], meta: {} },
        {
          data: { foo: 'bar' },
          include: {
            id: true,
          },
        },
      ),
    ).toMatchInlineSnapshot(`
      {
        data: {
          foo: "bar"
        },
        include: {
          id: true
          ~~
        }
      }

      Invalid scalar field \`id\` for include statement.
      Note, that include statements only accept relation fields.
    `)
  })

  test('top level - with type descriptions', () => {
    expect(
      renderError(
        {
          kind: 'includeOnScalar',
          selectionPath: ['id'],
          meta: {
            outputType: {
              name: 'User',
              fields: [
                { name: 'id', typeName: 'Int', isRelation: false },
                { name: 'name', typeName: 'String', isRelation: false },
                { name: 'posts', typeName: 'Post', isRelation: true },
              ],
            },
          },
        },
        {
          data: { foo: 'bar' },
          include: {
            id: true,
          },
        },
      ),
    ).toMatchInlineSnapshot(`
      {
        data: {
          foo: "bar"
        },
        include: {
          id: true,
          ~~
      ?   posts?: true
        }
      }

      Invalid scalar field \`id\` for include statement on model User. Available options are listed in green.
      Note, that include statements only accept relation fields.
    `)
  })

  test('nested - no type description', () => {
    expect(
      renderError(
        { kind: 'includeOnScalar', selectionPath: ['posts', 'id'], meta: {} },
        {
          data: { foo: 'bar' },
          include: {
            posts: {
              include: {
                id: true,
              },
            },
          },
        },
      ),
    ).toMatchInlineSnapshot(`
      {
        data: {
          foo: "bar"
        },
        include: {
          posts: {
            include: {
              id: true
              ~~
            }
          }
        }
      }

      Invalid scalar field \`id\` for include statement.
      Note, that include statements only accept relation fields.
    `)
  })

  test('nested - with type descriptions', () => {
    expect(
      renderError(
        {
          kind: 'includeOnScalar',
          selectionPath: ['posts', 'id'],
          meta: {
            outputType: {
              name: 'Post',
              fields: [
                { name: 'id', typeName: 'Int', isRelation: false },
                { name: 'title', typeName: 'String', isRelation: false },
                { name: 'likes', typeName: 'Like', isRelation: true },
              ],
            },
          },
        },
        {
          data: { foo: 'bar' },
          include: {
            posts: {
              include: {
                id: true,
              },
            },
          },
        },
      ),
    ).toMatchInlineSnapshot(`
      {
        data: {
          foo: "bar"
        },
        include: {
          posts: {
            include: {
              id: true,
              ~~
      ?       likes?: true
            }
          }
        }
      }

      Invalid scalar field \`id\` for include statement on model Post. Available options are listed in green.
      Note, that include statements only accept relation fields.
    `)
  })
})

describe('EmptySelection', () => {
  test('top level', () => {
    expect(
      renderError(
        {
          kind: 'EmptySelection',
          selectionPath: [],
          meta: {
            outputType: PostOutputDescription,
          },
        },
        { where: { published: true }, select: {} },
      ),
    ).toMatchInlineSnapshot(`
      {
        where: {
          published: true
        },
        select: {
      ?   id?: true,
      ?   title?: true,
      ?   comments?: true
        }
      }

      The \`select\` statement for type Post must not be empty. Available options are listed in green.
    `)
  })

  test('top level with falsy values', () => {
    expect(
      renderError(
        {
          kind: 'EmptySelection',
          selectionPath: [],
          meta: {
            outputType: PostOutputDescription,
          },
        },
        { where: { published: true }, select: { id: false } },
      ),
    ).toMatchInlineSnapshot(`
      {
        where: {
          published: true
        },
        select: {
      ?   id?: true,
      ?   title?: true,
      ?   comments?: true
        }
      }

      The \`select\` statement for type Post needs at least one truthy value.
    `)
  })

  test('nested', () => {
    expect(
      renderError(
        {
          kind: 'EmptySelection',
          selectionPath: ['users', 'posts'],
          meta: {
            outputType: PostOutputDescription,
          },
        },
        { select: { users: { include: { posts: { select: {} } } } } },
      ),
    ).toMatchInlineSnapshot(`
      {
        select: {
          users: {
            include: {
              posts: {
                select: {
      ?           id?: true,
      ?           title?: true,
      ?           comments?: true
                }
              }
            }
          }
        }
      }

      The \`select\` statement for type Post must not be empty. Available options are listed in green.
    `)
  })
})

describe('UnknownSelectionField', () => {
  test('top level select', () => {
    expect(
      renderError(
        {
          kind: 'UnknownSelectionField',
          selectionPath: ['notThere'],
          meta: {
            outputType: PostOutputDescription,
          },
        },
        { select: { notThere: true } },
      ),
    ).toMatchInlineSnapshot(`
      {
        select: {
          notThere: true,
          ~~~~~~~~
      ?   id?: true,
      ?   title?: true,
      ?   comments?: true
        }
      }

      Unknown field \`notThere\` for select statement on model Post. Available options are listed in green.
    `)
  })

  test('top level include', () => {
    expect(
      renderError(
        {
          kind: 'UnknownSelectionField',
          selectionPath: ['notThere'],
          meta: {
            outputType: PostOutputDescription,
          },
        },
        { include: { notThere: true } },
      ),
    ).toMatchInlineSnapshot(`
      {
        include: {
          notThere: true,
          ~~~~~~~~
      ?   id?: true,
      ?   title?: true,
      ?   comments?: true
        }
      }

      Unknown field \`notThere\` for include statement on model Post. Available options are listed in green.
    `)
  })

  test('nested select', () => {
    expect(
      renderError(
        {
          kind: 'UnknownSelectionField',
          selectionPath: ['users', 'posts', 'notThere'],
          meta: {
            outputType: PostOutputDescription,
          },
        },
        { select: { users: { select: { posts: { select: { notThere: true } } } } } },
      ),
    ).toMatchInlineSnapshot(`
      {
        select: {
          users: {
            select: {
              posts: {
                select: {
                  notThere: true,
                  ~~~~~~~~
      ?           id?: true,
      ?           title?: true,
      ?           comments?: true
                }
              }
            }
          }
        }
      }

      Unknown field \`notThere\` for select statement on model Post. Available options are listed in green.
    `)
  })

  test('nested level include', () => {
    expect(
      renderError(
        {
          kind: 'UnknownSelectionField',
          selectionPath: ['users', 'posts', 'notThere'],
          meta: {
            outputType: PostOutputDescription,
          },
        },
        { select: { users: { include: { posts: { include: { notThere: true } } } } } },
      ),
    ).toMatchInlineSnapshot(`
      {
        select: {
          users: {
            include: {
              posts: {
                include: {
                  notThere: true,
                  ~~~~~~~~
      ?           id?: true,
      ?           title?: true,
      ?           comments?: true
                }
              }
            }
          }
        }
      }

      Unknown field \`notThere\` for include statement on model Post. Available options are listed in green.
    `)
  })
})

describe('UnknownArgument', () => {
  test('top level', () => {
    expect(
      renderError(
        {
          kind: 'UnknownArgument',
          selectionPath: [],
          argumentPath: ['notValid'],
          meta: {
            arguments: [
              { name: 'where', typeNames: ['PostWhereInput'] },
              { name: 'orderBy', typeNames: ['PostOrderByWithRelationInput', 'List<PostOrderByWithRelationInput>'] },
              { name: 'take', typeNames: ['Int'] },
            ],
          },
        },
        { notValid: 123 },
      ),
    ).toMatchInlineSnapshot(`
      {
        notValid: 123
        ~~~~~~~~
      }


    `)
  })
})
