---
name: schema-design
description: Apply consistent Pydantic schema and data model design standards
user-invocable: true
---

Naming: `<Resource>Create`, `<Resource>Update`, `<Resource>Response` -- never reuse the same schema for input and output
Base models: inherit from a shared `BaseSchema(BaseModel)` with `model_config = ConfigDict(from_attributes=True)`
Validation: use `@field_validator` and `@model_validator` for cross-field constraints
Optional fields: use `field: T | None = None` -- never bare `Optional[T]`
IDs: expose `id: uuid.UUID` in responses, accept `id: uuid.UUID` in path params -- never expose internal DB int PKs
Timestamps: always include `created_at: datetime` and `updated_at: datetime` in response schemas
Enums: define as `class MyEnum(str, enum.Enum)` for JSON-serializable string enums
