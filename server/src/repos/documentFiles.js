import { one, query } from '../db/pool.js';

export async function save({ storedName, applicationId, documentCode, fileName, mimeType, sizeBytes, data }) {
  return one(
    `INSERT INTO document_files (stored_name, application_id, document_code, file_name, mime_type, size_bytes, data)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, stored_name`,
    [storedName, applicationId, documentCode, fileName, mimeType, sizeBytes, data]
  );
}

export async function findByStoredName(storedName) {
  return one('SELECT * FROM document_files WHERE stored_name = $1', [storedName]);
}

export async function removeByStoredName(storedName) {
  await query('DELETE FROM document_files WHERE stored_name = $1', [storedName]);
}
