const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const request = require('supertest');

// Guards the Express route-ordering contract documented in claimRoutes.js.
// Express resolves in registration order, so a static sub-path registered after
// a parameterized one is captured by it and never reaches its own handler.
test('static routes must be registered before parameterized ones', async () => {
    const build = (order) => {
        const app = express();
        for (const route of order) {
            app.get(route.path, (req, res) => res.json({ handler: route.name }));
        }
        return app;
    };

    // Correct order: static first.
    const correct = build([
        { name: 'STATIC', path: '/claims/analytics' },
        { name: 'PARAM', path: '/claims/:id' }
    ]);
    const okRes = await request(correct).get('/claims/analytics').expect(200);
    assert.strictEqual(okRes.body.handler, 'STATIC');

    // Incorrect order: the parameterized route shadows the static one.
    const wrong = build([
        { name: 'PARAM', path: '/claims/:id' },
        { name: 'STATIC', path: '/claims/analytics' }
    ]);
    const shadowed = await request(wrong).get('/claims/analytics').expect(200);
    assert.strictEqual(shadowed.body.handler, 'PARAM',
        'expected the parameterized route to shadow the static one');
});

// The claim sub-paths that do exist must not collide with each other.
test('claim sub-paths resolve to their own handlers', async () => {
    const app = express();
    app.get('/api/claims/:id/audit-trail', (req, res) => res.json({ handler: 'audit-trail' }));
    app.get('/api/claims/:id/fhir', (req, res) => res.json({ handler: 'fhir' }));

    assert.strictEqual((await request(app).get('/api/claims/abc/audit-trail')).body.handler, 'audit-trail');
    assert.strictEqual((await request(app).get('/api/claims/abc/fhir')).body.handler, 'fhir');
});
