// Local settings from .env in the folder the server runs in. Real environment variables
// win, and hosts like Render set those instead of using a file
try {
  process.loadEnvFile();
} catch (error) {
  if (error.code !== 'ENOENT') {
    throw error;
  }
}
