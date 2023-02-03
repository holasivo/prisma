import { IncludeAndSelectError, IncludeOnScalarError, ValidationError } from '../types/ValidationError'
import { ArgumentsRenderingTree } from './ArgumentsRenderingTree'
import { ObjectFieldSuggestion } from './ObjectFieldSuggestion'
import { ObjectValue } from './ObjectValue'

export function applyValidationError(error: ValidationError, args: ArgumentsRenderingTree): void {
  switch (error.kind) {
    case 'includeAndSelect':
      applyIncludeAndSelectError(error, args)
      break
    case 'includeOnScalar':
      applyIncludeOnScalarError(error, args)
      break
    default:
      throw new Error('not implemented')
  }
}

function applyIncludeAndSelectError(error: IncludeAndSelectError, argsTree: ArgumentsRenderingTree) {
  const object = argsTree.arguments.getDeepSelectionValue(error.selectionPath)
  if (object && object instanceof ObjectValue) {
    object.getField('include')?.markAsError()
    object.getField('select')?.markAsError()
  }

  argsTree.addErrorMessage(
    (chalk) =>
      `Please ${chalk.bold('either')} use ${chalk.greenBright('`include`')} or ${chalk.greenBright(
        '`select`',
      )}, but ${chalk.redBright('not both')} at the same time.`,
  )
}

function applyIncludeOnScalarError(error: IncludeOnScalarError, argsTree: ArgumentsRenderingTree) {
  const [selectionPath, field] = splitSelectionPath(error.selectionPath)
  const outputType = error.meta.outputType

  const object = argsTree.arguments.getDeepSelectionParent(selectionPath)
  if (object) {
    object.getField(field)?.markAsError()

    if (outputType) {
      for (const field of outputType.fields) {
        if (field.isRelation) {
          object.addSuggestion(new ObjectFieldSuggestion(field.name, 'true'))
        }
      }
    }
  }

  argsTree.addErrorMessage((chalk) => {
    let msg = `Invalid scalar field ${chalk.redBright(`\`${field}\``)} for ${chalk.bold('include')} statement`
    if (outputType) {
      msg += `on model ${chalk.bold(outputType.name)}. Available options are listed in ${chalk.greenBright('green')}.`
    } else {
      msg += '.'
    }

    msg += `\nNote, that ${chalk.bold('include')} statements only accept relation fields.`
    return msg
  })
}

function splitSelectionPath(path: string[]): [selectionParent: string[], fieldName: string] {
  const selectionPath = [...path]
  const fieldName = selectionPath.pop()
  if (!fieldName) {
    throw new Error('unexpected empty path')
  }
  return [selectionPath, fieldName]
}
