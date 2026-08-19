---
"@effect/ai-amazon-bedrock": minor
---

Send text documents to the Amazon Bedrock Converse API as `source.text`.

`DocumentSource` now models the union's `text` member alongside `bytes` and `s3Location`, and a file
part whose media type starts with `text/` — `text/plain`, `text/markdown`, `text/csv`, `text/html` —
is sent as a plain string rather than base64. Base64 inflates a payload by about a third, so this is
a meaningfully smaller request for text documents. Binary formats such as pdf, Word and Excel still
go as `bytes`, and an `s3://` url still becomes an `s3Location` reference. Because `Prompt.FilePart`
string data is base64, it is now decoded rather than forwarded: data that is not valid base64 fails
with `AiError.InvalidUserInputError` naming the document, instead of drawing an opaque 400 from
Bedrock.
