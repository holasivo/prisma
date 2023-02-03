import { ObjectField } from './ObjectField'
import { ObjectFieldSuggestion } from './ObjectFieldSuggestion'
import { ErrorBasicBuilder, ErrorWriter } from './types'
import { Value } from './Value'

const fieldsSeparator: ErrorBasicBuilder = {
  write(writer) {
    writer.writeLine(',')
  },
}

export class ObjectValue implements ErrorBasicBuilder {
  private fields: Record<string, ObjectField> = {}
  private suggestions: ObjectFieldSuggestion[] = []

  addField(field: ObjectField) {
    this.fields[field.name] = field
  }

  addSuggestion(suggestion: ObjectFieldSuggestion) {
    this.suggestions.push(suggestion)
  }

  getField(key: string): ObjectField | undefined {
    return this.fields[key]
  }

  getFieldValue(key: string): Value | undefined {
    return this.getField(key)?.value
  }

  getDeepSelectionValue(path: string[]): Value | undefined {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let selection: Value = this
    for (const segment of path) {
      if (!(selection instanceof ObjectValue)) {
        return undefined
      }
      const next = selection.getSelectionValue(segment)
      if (!next) {
        return undefined
      }

      selection = next
    }

    return selection
  }

  getDeepSelectionParent(path: string[]): ObjectValue | undefined {
    const thisParent = this.getSelectionParent()
    if (!thisParent) {
      return undefined
    }

    let parent = thisParent

    for (const segment of path) {
      const next = parent.getFieldValue(segment)
      if (!next || !(next instanceof ObjectValue)) {
        return undefined
      }

      const nextParent = next.getSelectionParent()
      if (!nextParent) {
        return undefined
      }
      parent = nextParent
    }

    return parent
  }

  getSelectionParent(): ObjectValue | undefined {
    const select = this.getField('select')
    if (select?.value instanceof ObjectValue) {
      return select.value
    }

    const include = this.getField('include')
    if (include?.value instanceof ObjectValue) {
      return include.value
    }
    return undefined
  }

  getSelectionValue(key: string): Value | undefined {
    return this.getSelectionParent()?.fields[key].value
  }

  write(writer: ErrorWriter): void {
    const fields = Object.values(this.fields)
    if (fields.length === 0) {
      writer.write('{}')
      return
    }

    writer.writeLine('{').withIndent(() => {
      writer.writeJoined(fieldsSeparator, [...fields, ...this.suggestions]).newLine()
    })

    writer.write('}')
  }
}
