export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

export const logError = (scope: string, error: unknown) => {
  console.error(`[${scope}]`, error);
};

export const isPrismaMissingColumnError = (error: unknown, columnName?: string) => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: string; meta?: { column?: string } };
  if (candidate.code !== 'P2022') {
    return false;
  }

  if (!columnName) {
    return true;
  }

  return candidate.meta?.column?.toLowerCase().includes(columnName.toLowerCase()) ?? false;
};

export const getRequiredEnv = (name: string) => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
};

export const hasRequiredEnv = (name: string) => Boolean(process.env[name]?.trim());
