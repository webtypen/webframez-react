// src/auth-server.ts
function getAuth(context) {
  return context.request?.auth ?? null;
}
export {
  getAuth
};
