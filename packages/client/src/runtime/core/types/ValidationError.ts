export type IncludeAndSelectError = {
  kind: 'includeAndSelect'
  selectionPath: string[]
}

export type IncludeOnScalarError = {
  kind: 'includeOnScalar'
  selectionPath: string[]
  meta: {
    outputType?: OutputTypeDescription
  }
}
export type ValidationError = IncludeAndSelectError | IncludeOnScalarError

// TODO: engine-side validation errors

export type OutputTypeDescription = {
  name: string
  fields: OutputTypeDescriptionField[]
}

type OutputTypeDescriptionField = {
  name: string
  typeName: string
  isRelation: boolean
}
