import chalk from 'chalk'

import { Writer } from '../../../generation/ts-builders/Writer'
import { JsArgs } from '../types/JsApi'
import { ValidationError } from '../types/ValidationError'
import { applyValidationError } from './applyValidationError'
import { buildArgumentsRenderingTree } from './ArgumentsRenderingTree'

const renderArguments = (error: ValidationError, args: JsArgs) => {
  const argsTree = buildArgumentsRenderingTree(args)
  applyValidationError(error, argsTree)

  const context = { chalk: new chalk.Instance({ level: 0 }) }
  return new Writer(0, context).write(argsTree).toString()
}

describe('includeAndSelect', () => {
  test('top level', () => {
    expect(
      renderArguments(
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
    `)
  })

  test('deep', () => {
    expect(
      renderArguments(
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
    `)
  })
})

describe('includeOnScalar', () => {
  test('top level - no type description', () => {
    expect(
      renderArguments(
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
    `)
  })

  test('top level - with type descriptions', () => {
    expect(
      renderArguments(
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
      ?   posts: true
        }
      }
    `)
  })

  test('nested - no type description', () => {
    expect(
      renderArguments(
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
    `)
  })

  test('nested - with type descriptions', () => {
    expect(
      renderArguments(
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
      ?       likes: true
            }
          }
        }
      }
    `)
  })
})
