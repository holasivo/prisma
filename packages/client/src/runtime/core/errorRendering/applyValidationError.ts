import { EmptySelectionError, OutputTypeDescription, UnknownSelectionFieldError } from '@prisma/engine-core'
import chalk from 'chalk'

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
    case 'EmptySelection':
      applyEmptySelectionError(error, args)
      break
    case 'UnknownSelectionField':
      applyUnknownSelectionFieldError(error, args)
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

  const object = argsTree.arguments.getDeepSelectionParent(selectionPath)?.value
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
      msg += ` on model ${chalk.bold(outputType.name)}. ${availableOptionsMessage(chalk)}`
    } else {
      msg += '.'
    }

    msg += `\nNote, that ${chalk.bold('include')} statements only accept relation fields.`
    return msg
  })
}

function applyEmptySelectionError(error: EmptySelectionError, argsTree: ArgumentsRenderingTree) {
  const outputType = error.meta.outputType
  const selection = argsTree.arguments.getDeepSelectionParent(error.selectionPath)?.value
  const isEmpty = selection?.isEmpty() ?? false

  if (selection) {
    selection.removeAllFields()
    addSelectionSuggestions(selection, outputType)
  }

  argsTree.addErrorMessage((chalk) => {
    if (isEmpty) {
      return `The ${chalk.red('`select`')} statement for type ${chalk.bold(
        outputType.name,
      )} must not be empty. ${availableOptionsMessage(chalk)}`
    }
    return `The ${chalk.red('`select`')} statement for type ${chalk.bold(outputType.name)} needs ${chalk.bold(
      'at least one truthy value',
    )}.`
  })
}

function applyUnknownSelectionFieldError(error: UnknownSelectionFieldError, argsTree: ArgumentsRenderingTree) {
  const [parentPath, fieldName] = splitSelectionPath(error.selectionPath)

  const selectionParent = argsTree.arguments.getDeepSelectionParent(parentPath)
  if (selectionParent) {
    selectionParent.value.getField(fieldName)?.markAsError()
    addSelectionSuggestions(selectionParent.value, error.meta.outputType)
  }

  argsTree.addErrorMessage((chalk) => {
    const parts = [`Unknown field ${chalk.redBright(`\`${fieldName}\``)}`]
    if (selectionParent) {
      parts.push(`for ${chalk.bold(selectionParent.kind)} statement`)
    }
    parts.push(`on model ${chalk.bold(error.meta.outputType.name)}.`)
    parts.push(availableOptionsMessage(chalk))
    return parts.join(' ')
  })
}

function addSelectionSuggestions(selection: ObjectValue, outputType: OutputTypeDescription) {
  for (const field of outputType.fields) {
    if (!selection.hasField(field.name)) {
      selection.addSuggestion(new ObjectFieldSuggestion(field.name, 'true'))
    }
  }
}

function splitSelectionPath(path: string[]): [selectionParent: string[], fieldName: string] {
  const selectionPath = [...path]
  const fieldName = selectionPath.pop()
  if (!fieldName) {
    throw new Error('unexpected empty path')
  }
  return [selectionPath, fieldName]
}

function availableOptionsMessage(chalk: chalk.Chalk) {
  return `Available options are listed in ${chalk.greenBright('green')}.`
}
