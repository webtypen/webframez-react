const test = require('node:test');
const assert = require('node:assert/strict');
const { getAuth } = require('../dist/auth-server.cjs');
const { AuthProvider, useAuth } = require('../dist/auth.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function AuthLabel() {
  const { user, isAuthenticated } = useAuth();
  return React.createElement('span', null, isAuthenticated ? user.name : 'anonymous');
}

test('getAuth returns the injected server context and anonymous requests stay null', () => {
  const model = { update() {}, password: 'server-secret' };
  const auth = { user: model, session: { id: 'session' } };
  assert.equal(getAuth({ request: { auth } }), auth);
  assert.equal(getAuth({ request: {} }), null);
});

test('useAuth reads the provided snapshot during SSR, including anonymous and logout states', () => {
  const render = auth => renderToStaticMarkup(React.createElement(AuthProvider, { auth }, React.createElement(AuthLabel)));
  assert.equal(render(null), '<span>anonymous</span>');
  assert.equal(render({ user: { name: 'Alice' }, session: { id: 'current' } }), '<span>Alice</span>');
  assert.equal(render(null), '<span>anonymous</span>');
});
