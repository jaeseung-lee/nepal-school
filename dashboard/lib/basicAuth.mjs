export function decodeBasicAuthHeader(authorization) {
  if (!authorization?.startsWith("Basic ")) {
    return null;
  }

  const encodedCredentials = authorization.slice("Basic ".length).trim();
  let decodedCredentials;

  try {
    decodedCredentials = atob(encodedCredentials);
  } catch {
    return null;
  }

  const separatorIndex = decodedCredentials.indexOf(":");

  if (separatorIndex < 0) {
    return null;
  }

  return {
    username: decodedCredentials.slice(0, separatorIndex),
    password: decodedCredentials.slice(separatorIndex + 1),
  };
}

function constantTimeEqual(left, right) {
  let mismatch = left.length ^ right.length;
  const maxLength = Math.max(left.length, right.length);

  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return mismatch === 0;
}

export function isBasicAuthValid(authorization, expectedUsername, expectedPassword) {
  const credentials = decodeBasicAuthHeader(authorization);

  if (!credentials) {
    return false;
  }

  return (
    constantTimeEqual(credentials.username, expectedUsername) &&
    constantTimeEqual(credentials.password, expectedPassword)
  );
}
