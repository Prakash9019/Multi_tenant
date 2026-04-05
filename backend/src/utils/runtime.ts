export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

export const logError = (scope: string, error: unknown) => {
  console.error(`[${scope}]`, error);
};

export const getRequiredEnv = (name: string) => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
};

export const hasRequiredEnv = (name: string) => Boolean(process.env[name]?.trim());
