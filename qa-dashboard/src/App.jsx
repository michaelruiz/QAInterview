import { useState, useEffect } from "react";

const CY = "#04C38E", PW = "#45BA4B", RA = "#FF6B35", YL = "#FFD700";

const CYPRESS_SECTIONS = [
  { title:"Setup & Config", icon:"⚙", items:[
    { q:"Install & Initialize", note:"cypress.config.js is the modern config (v10+). Older projects use cypress.json.",
      code:"npm install cypress --save-dev\nnpx cypress open   # GUI + generates config\nnpx cypress run    # Headless / CI mode" },
    { q:"cypress.config.js Key Options", note:"retries.runMode = CI retries; openMode = GUI retries. Interviewers ask this.",
      code:"export default defineConfig({ e2e: {\n  baseUrl: 'http://localhost:3000',\n  defaultCommandTimeout: 4000,\n  video: false,\n  screenshotOnRunFailure: true,\n  retries: { runMode: 2, openMode: 0 },\n  env: { apiUrl: 'https://api.example.com' },\n}})" },
    { q:"Project Structure", note:"",
      code:"cypress/\n├── e2e/          # Test files (.cy.js)\n├── fixtures/     # Static test data (JSON)\n├── support/\n│   ├── commands.js  # Custom commands\n│   └── e2e.js       # Global setup\ncypress.config.js" },
  ]},
  { title:"Selectors", icon:"🎯", items:[
    { q:"Selector Priority (Best to Worst)", note:"data-cy decouples tests from CSS/structure changes. Always explain WHY in interviews.",
      code:"// BEST: test-specific attributes\ncy.get('[data-cy=\"submit-btn\"]')\ncy.get('[data-testid=\"email-input\"]')\n\n// GOOD: accessible queries\ncy.findByRole('button', { name: /submit/i })\ncy.findByLabelText('Email')\n\n// OK: ID or name attribute\ncy.get('#username')\n\n// AVOID: fragile CSS classes\ncy.get('.MuiButton-root.primary')  // breaks on refactor\ncy.get('form > div > button')      // too brittle" },
    { q:"contains() and within()", note:"within() prevents false positives when similar elements exist elsewhere on page.",
      code:"cy.contains('Submit')\ncy.contains('button', 'Submit')   // element + text\ncy.contains(/submit/i)            // regex\n\n// Scope queries inside a container\ncy.get('[data-cy=\"user-card\"]').within(() => {\n  cy.get('h2').should('contain', 'Jane Doe')\n  cy.get('[data-cy=\"edit-btn\"]').click()\n})" },
  ]},
  { title:"Assertions", icon:"✓", items:[
    { q:"should() — Core Assertions", note:"Cypress retries assertions automatically until they pass or timeout. No explicit waits needed.",
      code:"// Existence & Visibility\ncy.get('[data-cy=\"modal\"]').should('exist')\ncy.get('[data-cy=\"modal\"]').should('be.visible')\ncy.get('[data-cy=\"spinner\"]').should('not.exist')\n\n// Text & Value\ncy.get('h1').should('have.text', 'Dashboard')\ncy.get('h1').should('contain.text', 'Dash')\ncy.get('input').should('have.value', 'test@example.com')\n\n// Attributes & State\ncy.get('btn').should('have.class', 'active')\ncy.get('input').should('have.attr', 'placeholder', 'Email')\ncy.get('button').should('be.disabled')\ncy.get('[type=\"checkbox\"]').should('be.checked')\ncy.get('li').should('have.length', 5)" },
    { q:"and() — Chain Multiple Assertions", note:"",
      code:"cy.get('input')\n  .should('be.visible')\n  .and('have.attr', 'type', 'email')\n  .and('not.be.disabled')" },
    { q:"then() — Custom Value Assertion", note:"Use should() with callback for retry-able logic. then() drops retry-ability.",
      code:"cy.get('[data-cy=\"price\"]').then(($el) => {\n  const price = parseFloat($el.text().replace('$', ''))\n  expect(price).to.be.greaterThan(0)\n  expect(price).to.be.lessThan(1000)\n})" },
  ]},
  { title:"Actions", icon:"👆", items:[
    { q:"Common User Actions", note:"",
      code:"cy.get('input').type('hello world')\ncy.get('input').type('{enter}')         // keyboard keys\ncy.get('input').clear().type('new text')\n\ncy.get('button').click()\ncy.get('button').click({ force: true })  // bypass visibility check\ncy.get('button').dblclick()\n\ncy.get('select').select('Option 2')\ncy.get('[type=\"checkbox\"]').check()\ncy.get('[type=\"radio\"]').check('value')\ncy.get('input[type=\"file\"]').selectFile('cypress/fixtures/img.png')" },
    { q:"Hover (no native — workaround required)", note:"Hover is a common interview question. Cypress has no native hover. Know the workaround.",
      code:"// Use trigger() workaround\ncy.get('[data-cy=\"menu-item\"]').trigger('mouseover')\ncy.get('[data-cy=\"menu-item\"]').trigger('mouseenter')\n\n// Or invoke show() for jQuery-based UI\ncy.get('[data-cy=\"dropdown\"]')\n  .invoke('show')\n  .should('be.visible')" },
  ]},
  { title:"Network Interception", icon:"🌐", items:[
    { q:"cy.intercept() — Spy and Stub", note:"MUST be defined before the request fires. Define intercepts before cy.visit().",
      code:"// SPY: observe, don't modify\ncy.intercept('GET', '/api/users').as('getUsers')\ncy.visit('/users')\ncy.wait('@getUsers').then(({ response }) => {\n  expect(response.statusCode).to.eq(200)\n})\n\n// STUB: replace response entirely\ncy.intercept('GET', '/api/users', {\n  statusCode: 200,\n  body: [{ id: 1, name: 'Test User' }],\n}).as('mockUsers')\n\n// STUB with fixture file\ncy.intercept('GET', '/api/products', {\n  fixture: 'products.json',\n}).as('mockProducts')" },
    { q:"cy.wait() — Never Use Hardcoded Times", note:"Never use cy.wait(5000). Always wait on an alias. Interviewers dock points for hardcoded waits.",
      code:"cy.intercept('POST', '/api/login').as('login')\ncy.get('[data-cy=\"login-btn\"]').click()\n\n// Wait + assert request body\ncy.wait('@login').its('request.body')\n  .should('include', { email: 'user@test.com' })\n\n// Wait for multiple requests\ncy.wait(['@login', '@getProfile'])" },
  ]},
  { title:"Auth & Custom Commands", icon:"🔧", items:[
    { q:"cy.session() Login — Modern Best Practice", note:"cy.session() caches cookies + localStorage between tests. Massive performance win.",
      code:"// cypress/support/commands.js\nCypress.Commands.add('login', (email, password) => {\n  cy.session([email, password], () => {\n    cy.visit('/login')\n    cy.get('[data-cy=\"email\"]').type(email)\n    cy.get('[data-cy=\"password\"]').type(password)\n    cy.get('[data-cy=\"submit\"]').click()\n    cy.url().should('include', '/dashboard')\n  })\n})\n\n// API login (fastest — bypasses UI)\nCypress.Commands.add('loginViaApi', (email, password) => {\n  cy.request('POST', '/api/login', { email, password })\n    .then(({ body }) => {\n      window.localStorage.setItem('token', body.token)\n    })\n})" },
    { q:"Aliases — Share Data Between Commands", note:"When using this.xxx, always use function(){} not arrow functions — arrow fns break 'this'.",
      code:"cy.get('[data-cy=\"total\"]').as('total')\ncy.get('@total').should('contain', '$99')\n\n// Fixture alias — use function() for 'this'\ncy.fixture('user').as('user')\nit('test', function() {  // NOT an arrow function!\n  cy.get('input').type(this.user.email)\n})" },
  ]},
  { title:"Page Object Model", icon:"📐", items:[
    { q:"POM Pattern in Cypress", note:"POM is a top interview topic. Key benefit: centralizes selectors so changes are made in one place.",
      code:"// cypress/pages/LoginPage.js\nclass LoginPage {\n  elements = {\n    emailInput:    () => cy.get('[data-cy=\"email\"]'),\n    passwordInput: () => cy.get('[data-cy=\"password\"]'),\n    submitBtn:     () => cy.get('[data-cy=\"submit\"]'),\n  }\n  visit() { cy.visit('/login') }\n  login(email, pass) {\n    this.elements.emailInput().type(email)\n    this.elements.passwordInput().type(pass)\n    this.elements.submitBtn().click()\n  }\n}\nexport default new LoginPage()\n\n// In test:\nimport loginPage from '../pages/LoginPage'\nit('logs in', () => {\n  loginPage.visit()\n  loginPage.login('u@t.com', 'pass')\n  cy.url().should('include', '/dashboard')\n})" },
  ]},
  { title:"Interview Q&A", icon:"🎤", items:[
    { q:"Q: How does Cypress differ from Selenium?", note:"Know this cold. Asked in nearly every QA interview.",
      code:"// Cypress: Runs INSIDE the browser (same JS event loop)\n// - Direct DOM access, no WebDriver protocol\n// - Auto-wait, no explicit waits needed\n// - Time travel debugging (snapshots)\n// - Network stubbing built-in\n// - JavaScript/TypeScript only\n// - No multi-tab, limited multi-origin\n\n// Selenium: Runs OUTSIDE via WebDriver protocol\n// - All languages (Java, Python, C#, JS)\n// - True cross-browser including IE\n// - Mobile testing via Appium\n// - More verbose, more setup, slower" },
    { q:"Q: How do you handle flaky tests?", note:"Show you understand ROOT CAUSES: timing, shared state, brittle selectors.",
      code:"// 1. Use cy.intercept() + cy.wait('@alias') not timers\n// 2. Use data-cy attributes not CSS classes\n// 3. Enable retries:  retries: { runMode: 2 }\n// 4. Isolate test state — don't rely on other tests\n// 5. Use cy.session() for consistent auth state\n// 6. Use cy.clock() for time-dependent logic\ncy.clock(Date.UTC(2024, 0, 1))" },
    { q:"Q: How do you handle auth in Cypress?", note:"cy.session() is the modern answer. UI login every test is slow and fragile.",
      code:"// BEST: cy.session() — caches between tests\nCypress.Commands.add('login', (u, p) => {\n  cy.session([u, p], () => { /* UI login once */ })\n})\n\n// FAST: API login — bypass UI entirely\ncy.request('POST', '/api/login', { email, password })\n  .its('body.token')\n  .then(token => localStorage.setItem('auth_token', token))\n\n// DIRECT: set cookie\ncy.setCookie('session_id', 'abc123')" },
  ]},
];

const PLAYWRIGHT_SECTIONS = [
  { title:"Setup & Config", icon:"⚙", items:[
    { q:"Install & Initialize", note:"Playwright installs its own browser binaries for consistent cross-browser behavior.",
      code:"npm init playwright@latest\n# Installs Playwright + browsers + config\n\nnpx playwright test          # Run all tests\nnpx playwright test --ui     # Visual UI mode\nnpx playwright test --headed # See the browser\nnpx playwright codegen https://example.com\nnpx playwright show-report" },
    { q:"playwright.config.ts — Key Settings", note:"projects[] is Playwright's killer feature — all browsers + devices in one config.",
      code:"export default defineConfig({\n  testDir: './tests',\n  timeout: 30_000,\n  expect: { timeout: 5_000 },\n  fullyParallel: true,\n  retries: process.env.CI ? 2 : 0,\n  reporter: 'html',\n  use: {\n    baseURL: 'http://localhost:3000',\n    trace: 'on-first-retry',\n    screenshot: 'only-on-failure',\n    video: 'retain-on-failure',\n  },\n  projects: [\n    { name: 'chromium', use: { ...devices['Desktop Chrome']  } },\n    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },\n    { name: 'webkit',   use: { ...devices['Desktop Safari']  } },\n    { name: 'mobile',   use: { ...devices['iPhone 13']       } },\n  ],\n})" },
  ]},
  { title:"Locators", icon:"🎯", items:[
    { q:"Locator Priority (Best to Worst)", note:"getByRole() follows ARIA — accessibility-first locators impress interviewers.",
      code:"// BEST: user-facing, accessible locators\npage.getByRole('button', { name: 'Submit' })\npage.getByLabel('Email address')\npage.getByPlaceholder('Enter your email')\npage.getByText('Welcome back')\npage.getByAltText('Company logo')\n\n// GOOD: test IDs\npage.getByTestId('submit-button')\n\n// OK: CSS selectors\npage.locator('#username')\npage.locator('[data-cy=\"email\"]')\n\n// Chaining\npage.getByRole('dialog').getByRole('button', { name: 'OK' })\npage.locator('.user-card').filter({ hasText: 'Jane' })" },
    { q:"Filtering, nth, and all()", note:"",
      code:"page.locator('li').filter({ hasText: 'Product A' })\npage.locator('li').nth(0)\npage.locator('li').first()\npage.locator('li').last()\n\nconst count = await page.locator('li').count()\n\nconst items = await page.locator('li').all()\nfor (const item of items) {\n  await expect(item).toBeVisible()\n}" },
  ]},
  { title:"Assertions", icon:"✓", items:[
    { q:"Web-First Assertions — All Auto-Retry", note:"CRITICAL: All expect() assertions retry until pass or timeout. Playwright's biggest selling point.",
      code:"await expect(page.getByRole('heading')).toBeVisible()\nawait expect(page.getByRole('heading')).toBeHidden()\nawait expect(page.getByRole('button')).toBeEnabled()\nawait expect(page.getByRole('button')).toBeDisabled()\nawait expect(page.getByRole('checkbox')).toBeChecked()\n\nawait expect(page.getByRole('heading')).toHaveText('Dashboard')\nawait expect(page.getByRole('heading')).toContainText('Dash')\nawait expect(page.locator('input')).toHaveValue('user@email.com')\n\nawait expect(page.locator('li')).toHaveCount(5)\nawait expect(page).toHaveURL('/dashboard')\nawait expect(page).toHaveTitle('My App')" },
    { q:"Soft Assertions — Unique to Playwright", note:"Cypress stops on first failure. Playwright soft assertions let the test run fully.",
      code:"// Test continues even if one assertion fails\nawait expect.soft(page.getByTestId('title')).toHaveText('Cart')\nawait expect.soft(page.getByTestId('count')).toHaveText('3 items')\nawait expect.soft(page.getByTestId('total')).toContainText('$99')\n// Completes full test, then reports ALL failures" },
  ]},
  { title:"Actions", icon:"👆", items:[
    { q:"User Actions (with real hover support)", note:"Playwright has REAL hover. Cypress uses trigger() workaround. Know this difference.",
      code:"await page.click('[data-testid=\"btn\"]')\nawait page.dblclick('[data-testid=\"item\"]')\n\nawait page.fill('[data-testid=\"email\"]', 'user@test.com')\nawait page.clear('[data-testid=\"search\"]')\nawait page.press('[data-testid=\"input\"]', 'Enter')\n\nawait page.setInputFiles('[type=\"file\"]', 'file.pdf')\nawait page.dragAndDrop('#source', '#target')\nawait page.selectOption('select', 'option-value')\n\nawait page.hover('[data-testid=\"menu\"]')  // NATIVE hover!\n\nawait page.keyboard.press('Tab')\nawait page.keyboard.type('Hello World')" },
    { q:"Navigation and Waiting", note:"",
      code:"await page.goto('/login', { waitUntil: 'networkidle' })\nawait page.goBack()\nawait page.reload()\n\nawait page.waitForURL('/dashboard')\nawait page.waitForLoadState('networkidle')\n\n// Wait for response\nconst responsePromise = page.waitForResponse('/api/users')\nawait page.click('#load-users')\nconst response = await responsePromise\nconst data = await response.json()" },
  ]},
  { title:"Network Interception", icon:"🌐", items:[
    { q:"page.route() — Mock and Intercept", note:"",
      code:"// STUB response\nawait page.route('/api/users', route => {\n  route.fulfill({\n    status: 200,\n    contentType: 'application/json',\n    body: JSON.stringify([{ id: 1, name: 'Mock' }]),\n  })\n})\n\n// ABORT (simulate offline / block images)\nawait page.route('**/*.{png,jpg}', route => route.abort())\n\n// MODIFY request headers\nawait page.route('/api/auth', route => {\n  route.continue({\n    headers: { ...route.request().headers(), 'X-Auth': 'token' }\n  })\n})" },
    { q:"API Request Context — Built-in HTTP Client", note:"request fixture = built-in HTTP client. Combine API setup + UI assertion in one test.",
      code:"test('hybrid API and UI test', async ({ page, request }) => {\n  // Set up test data via API\n  const res = await request.post('/api/users', {\n    data: { name: 'Test User', email: 'u@t.com' }\n  })\n  expect(res.status()).toBe(201)\n\n  // Then verify in the UI\n  await page.goto('/users')\n  await expect(page.getByText('Test User')).toBeVisible()\n})" },
  ]},
  { title:"Auth: storageState", icon:"🔐", items:[
    { q:"Global Setup — Login Once Reuse Everywhere", note:"storageState = Playwright's cy.session(). Login once, ALL tests reuse the saved state.",
      code:"// auth.setup.ts — runs ONCE before all tests\nimport { chromium } from '@playwright/test'\nasync function globalSetup() {\n  const browser = await chromium.launch()\n  const page = await browser.newPage()\n  await page.goto('http://localhost:3000/login')\n  await page.fill('#email', process.env.TEST_EMAIL)\n  await page.fill('#pass',  process.env.TEST_PASS)\n  await page.click('#submit')\n  await page.waitForURL('/dashboard')\n  await page.context().storageState({\n    path: 'playwright/.auth/user.json'\n  })\n  await browser.close()\n}\nexport default globalSetup\n\n// playwright.config.ts\nuse: { storageState: 'playwright/.auth/user.json' }\nglobalSetup: require.resolve('./auth.setup.ts')" },
    { q:"Multiple Auth Roles", note:"",
      code:"projects: [\n  {\n    name: 'admin tests',\n    use: { storageState: '.auth/admin.json' },\n    testMatch: 'tests/admin/**',\n  },\n  {\n    name: 'user tests',\n    use: { storageState: '.auth/user.json' },\n    testMatch: 'tests/user/**',\n  },\n]" },
  ]},
  { title:"Advanced Patterns", icon:"⚡", items:[
    { q:"Page Object Model in Playwright", note:"",
      code:"// tests/pages/LoginPage.ts\nimport { type Page, type Locator } from '@playwright/test'\n\nexport class LoginPage {\n  readonly emailInput: Locator\n  readonly passwordInput: Locator\n  readonly submitButton: Locator\n\n  constructor(private page: Page) {\n    this.emailInput    = page.getByLabel('Email')\n    this.passwordInput = page.getByLabel('Password')\n    this.submitButton  = page.getByRole('button', { name: 'Sign in' })\n  }\n\n  async goto() { await this.page.goto('/login') }\n\n  async login(email: string, password: string) {\n    await this.emailInput.fill(email)\n    await this.passwordInput.fill(password)\n    await this.submitButton.click()\n  }\n}" },
    { q:"Multi-Tab — Cypress Cannot Do This Natively", note:"Multi-tab is a key Playwright advantage. Essential for OAuth, payment redirect flows.",
      code:"// Wait for popup / new tab to open\nconst newTabPromise = page.waitForEvent('popup')\nawait page.click('[target=\"_blank\"]')\nconst newTab = await newTabPromise\nawait newTab.waitForLoadState()\nawait expect(newTab).toHaveURL(/expected-url/)\n\n// Multiple pages in same browser context\nconst ctx = await browser.newContext()\nconst page1 = await ctx.newPage()\nconst page2 = await ctx.newPage()" },
    { q:"Free Parallel and Sharding (CI)", note:"Cypress parallel requires paid Cloud. Playwright is free and built-in.",
      code:"// fullyParallel: true in config = auto parallel\n\n// CI sharding — split tests across machines\nnpx playwright test --shard=1/3\nnpx playwright test --shard=2/3\nnpx playwright test --shard=3/3\n\n// Control within a describe block\ntest.describe.configure({ mode: 'parallel' })\ntest.describe.configure({ mode: 'serial' })" },
  ]},
  { title:"Interview Q&A", icon:"🎤", items:[
    { q:"Q: Playwright vs Selenium — key differences?", note:"Mention the trace viewer — visual timeline of every action + network request.",
      code:"// Playwright advantages:\n// 1. Auto-wait on ALL actions (no Thread.sleep)\n// 2. Free built-in parallel execution\n// 3. Cross-browser: Chromium, Firefox, WebKit\n// 4. Network interception built-in\n// 5. Trace viewer — visual test execution timeline\n// 6. Video + screenshot recording built-in\n// 7. Multi-tab and cross-origin support\n// 8. Codegen tool to record tests\n// 9. Much faster than Selenium WebDriver" },
    { q:"Q: How do you debug failing Playwright tests?", note:"",
      code:"// 1. UI mode — interactive step-through\nnpx playwright test --ui\n\n// 2. Debug mode\nnpx playwright test --debug\n\n// 3. Trace viewer — full visual timeline\nnpx playwright show-trace test-results/trace.zip\n\n// 4. Pause mid-test in inspector\nawait page.pause()\n\n// 5. Capture on failure in config\nuse: {\n  screenshot: 'only-on-failure',\n  video: 'retain-on-failure',\n  trace: 'on-first-retry',\n}" },
  ]},
];

const COMPARISON = [
  { cat:"Architecture",      cy:"Runs IN browser (same JS event loop). Direct DOM access.",           pw:"Runs outside via CDP/WebSocket. Controls browser externally.",      w:"draw" },
  { cat:"Browser Support",   cy:"Chrome, Edge, Firefox. Safari = experimental only.",                 pw:"Chromium, Firefox, WebKit (Safari). Full production support.",         w:"pw" },
  { cat:"Multi-Tab",         cy:"Not natively supported. Workarounds are fragile.",                   pw:"Full native support. waitForEvent('popup'), multiple pages.",          w:"pw" },
  { cat:"Multi-Origin",      cy:"Limited. cy.origin() in v9.6+ but still restricted.",               pw:"Full cross-origin. No restrictions. Essential for SSO / OAuth.",       w:"pw" },
  { cat:"Hover Support",     cy:"No native hover. Use trigger('mouseover') workaround.",              pw:"Native hover: await page.hover(selector)",                             w:"pw" },
  { cat:"Auto-Waiting",      cy:"Auto-retries assertions and most commands.",                         pw:"Auto-waits on ALL actions: visible, stable, attached, enabled.",       w:"pw" },
  { cat:"Parallel",          cy:"Requires Cypress Cloud (paid). Free = sequential.",                  pw:"Free, built-in. Sharding for CI. Zero extra cost.",                    w:"pw" },
  { cat:"Language Support",  cy:"JavaScript and TypeScript only.",                                    pw:"JavaScript, TypeScript, Python, Java, C#.",                            w:"pw" },
  { cat:"Soft Assertions",   cy:"Not supported. Stops on first assertion failure.",                   pw:"expect.soft() — continue after failure, report all at end.",           w:"pw" },
  { cat:"Debugging",         cy:"Time-travel snapshots in Test Runner. Very visual.",                  pw:"Trace viewer, UI mode, VS Code debugger, codegen.",                    w:"draw" },
  { cat:"Learning Curve",    cy:"Easier. jQuery-like API. Excellent error messages.",                 pw:"Moderate. async/await everywhere. More concepts to learn.",             w:"cy" },
  { cat:"Component Testing", cy:"Production-ready (React, Vue, Angular, Svelte).",                   pw:"Experimental. Less mature than Cypress.",                              w:"cy" },
  { cat:"Community",         cy:"Large, established. More plugins. Longer history.",                  pw:"Rapidly growing. Microsoft-backed. Excellent docs.",                   w:"cy" },
  { cat:"CI / CD",           cy:"Good. Cypress Cloud for reporting (paid).",                          pw:"HTML reports built-in. Free sharding. GitHub Actions native.",          w:"pw" },
  { cat:"API Testing",       cy:"cy.request() + cy.intercept(). Solid.",                              pw:"request fixture = full HTTP client. API+UI hybrid tests.",             w:"pw" },
];

const RA_TIPS = [
  "given/when/then mirrors BDD Gherkin — always mention this connection.",
  "RequestSpecification reuse is key to DRY tests — always build a shared base spec.",
  "JSON Schema validation shows you think about contract testing.",
  "Parameterized tests (@ParameterizedTest) demonstrate data-driven testing knowledge.",
  "Mention Allure reporting integration — shows you care about test visibility.",
];

const RA_QUICK = [
  ["GET 200", "given().spec(spec).when().get(\"/endpoint\").then().statusCode(200)"],
  ["POST 201", "given().spec(spec).body(map).when().post(\"/users\").then().statusCode(201)"],
  ["PUT 200", "given().spec(spec).body(obj).when().put(\"/users/1\").then().statusCode(200)"],
  ["DELETE", "given().spec(spec).when().delete(\"/users/1\").then().statusCode(200)"],
  ["Assert field", ".body(\"field\", equalTo(\"value\"))"],
  ["Assert not null", ".body(\"id\", notNullValue())"],
  ["Assert count", ".body(\"size()\", equalTo(10))"],
  ["Extract value", ".extract().path(\"id\")"],
  ["Extract to POJO", ".extract().as(MyClass.class)"],
  ["Schema validate", ".body(matchesJsonSchemaInClasspath(\"schema.json\"))"],
  ["Auth header", "given().header(\"Authorization\", \"Bearer \" + token)"],
  ["Query param", "given().queryParam(\"userId\", 1)"],
  ["Path param", "given().pathParam(\"id\", 5).when().get(\"/posts/{id}\")"],
  ["Response time", ".time(lessThan(3000L))"],
  ["Base spec", "new RequestSpecBuilder().setBaseUri(BASE_URI).setContentType(JSON).build()"],
];

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1800); }}
      style={{ background: ok ? "#0d2a1a" : "transparent", border: `1px solid ${ok ? "#04C38E" : "#252535"}`, color: ok ? "#04C38E" : "#444", fontSize: "9px", padding: "3px 9px", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace", flexShrink: 0 }}>
      {ok ? "✓" : "copy"}
    </button>
  );
}

function CodeBlock({ code }) {
  return (
    <div style={{ background: "#07070f", border: "1px solid #14142a", borderRadius: "6px", overflow: "hidden", marginTop: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 12px", background: "#0b0b1a", borderBottom: "1px solid #14142a" }}>
        <span style={{ fontSize: "9px", color: "#2a2a4a", fontFamily: "monospace", letterSpacing: "1px" }}>CODE</span>
        <CopyBtn text={code} />
      </div>
      <pre style={{ margin: 0, padding: "13px 15px", fontSize: "11.5px", lineHeight: 1.75, fontFamily: "'JetBrains Mono','Fira Code',monospace", color: "#b0b0cc", overflowX: "auto", whiteSpace: "pre" }}>
        {code}
      </pre>
    </div>
  );
}

function TipBar({ tips, color }) {
  return (
    <div style={{ background: color + "0a", border: `1px solid ${color}28`, borderRadius: "8px", padding: "13px 16px", marginBottom: "18px" }}>
      <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "2px", color, fontFamily: "monospace", marginBottom: "9px" }}>★ INTERVIEW TIPS</div>
      {tips.map((t, i) => (
        <div key={i} style={{ display: "flex", gap: "8px", marginBottom: i < tips.length - 1 ? "6px" : 0 }}>
          <span style={{ color, fontSize: "11px", flexShrink: 0 }}>›</span>
          <span style={{ color: "#8888aa", fontSize: "11.5px", lineHeight: 1.6 }}>{t}</span>
        </div>
      ))}
    </div>
  );
}

function AccItem({ item, color, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div style={{ border: `1px solid ${open ? color + "30" : "#14142a"}`, borderRadius: "7px", overflow: "hidden", marginBottom: "5px" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", background: open ? color + "06" : "transparent", border: "none", cursor: "pointer", padding: "12px 15px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
        <span style={{ color: open ? "#e8e8ff" : "#8888aa", fontSize: "12.5px", fontWeight: 600, textAlign: "left", flex: 1, lineHeight: 1.4 }}>{item.q}</span>
        <span style={{ color: open ? color : "#333", fontSize: "14px", transform: open ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform .15s", flexShrink: 0 }}>›</span>
      </button>
      {open && (
        <div style={{ padding: "0 15px 15px" }}>
          {item.note ? (
            <div style={{ fontSize: "11px", color: "#6868a0", background: "#0a0a1a", borderLeft: `3px solid ${color}`, padding: "7px 11px", borderRadius: "0 5px 5px 0", marginBottom: "2px", lineHeight: 1.6 }}>
              💡 {item.note}
            </div>
          ) : null}
          <CodeBlock code={item.code} />
        </div>
      )}
    </div>
  );
}

function SectionGroup({ section, color }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: "7px" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", background: color + "07", border: `1px solid ${color}22`, borderRadius: "7px", padding: "11px 15px", cursor: "pointer", display: "flex", alignItems: "center", gap: "9px", marginBottom: open ? "7px" : 0 }}>
        <span style={{ fontSize: "13px" }}>{section.icon}</span>
        <span style={{ color: "#d0d0f0", fontSize: "13px", fontWeight: 700, flex: 1, textAlign: "left" }}>{section.title}</span>
        <span style={{ color: color + "90", fontSize: "11px", fontFamily: "monospace" }}>{section.items.length}</span>
        <span style={{ color: open ? color : "#444", fontSize: "13px", transform: open ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform .15s" }}>›</span>
      </button>
      {open && section.items.map((item, i) => (
        <AccItem key={i} item={item} color={color} defaultOpen={i === 0} />
      ))}
    </div>
  );
}

function ToolPane({ sections, tips, color, label, version }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
        <div style={{ fontSize: "18px", fontWeight: 800, color: "#f0f0ff" }}>{label}</div>
        <span style={{ fontSize: "10px", color: "#555570", fontFamily: "monospace", background: color + "18", padding: "2px 9px", borderRadius: "10px", border: `1px solid ${color}33` }}>v{version}</span>
      </div>
      <TipBar tips={tips} color={color} />
      {sections.map((s, i) => <SectionGroup key={i} section={s} color={color} />)}
    </div>
  );
}

function ComparePane() {
  const [filter, setFilter] = useState("all");
  const rows = filter === "all" ? COMPARISON : COMPARISON.filter(r => r.w === filter);
  const wColor = { cy: CY, pw: PW, draw: YL };
  const wLabel = { cy: "⬡ Cypress", pw: "▶ Playwright", draw: "Tie" };

  return (
    <div>
      <div style={{ fontSize: "18px", fontWeight: 800, color: "#f0f0ff", marginBottom: "6px" }}>Cypress vs Playwright</div>
      <div style={{ fontSize: "12px", color: "#555570", marginBottom: "16px" }}>Head-to-head — know this for any senior QA interview.</div>
      <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
        {[["all","All"],["pw","▶ PW wins"],["cy","⬡ CY wins"],["draw","Tie"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{ background: filter === v ? "#1a1a30" : "transparent", border: `1px solid ${filter === v ? "#3a3a60" : "#1a1a2a"}`, color: filter === v ? "#e0e0ff" : "#555570", padding: "5px 13px", borderRadius: "20px", cursor: "pointer", fontSize: "11px", fontWeight: 600 }}>
            {l}
          </button>
        ))}
      </div>
      {rows.map((r, i) => {
        const c = wColor[r.w];
        return (
          <div key={i} style={{ background: "#0a0a18", border: "1px solid #14142a", borderRadius: "7px", padding: "12px 14px", marginBottom: "5px", display: "grid", gridTemplateColumns: "120px 1fr 1fr 80px", gap: "10px", alignItems: "start" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#c0c0e0" }}>{r.cat}</span>
            <span style={{ fontSize: "11px", color: "#555570", lineHeight: 1.5 }}>{r.cy}</span>
            <span style={{ fontSize: "11px", color: "#555570", lineHeight: 1.5 }}>{r.pw}</span>
            <span style={{ background: c + "18", color: c, fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "4px", border: `1px solid ${c}33`, fontFamily: "monospace", textAlign: "center" }}>{wLabel[r.w]}</span>
          </div>
        );
      })}
      <div style={{ marginTop: "20px", background: "#0a0a18", border: "1px solid #1a1a2a", borderRadius: "10px", padding: "16px 18px" }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: YL, letterSpacing: "2px", fontFamily: "monospace", marginBottom: "12px" }}>★ WHEN TO CHOOSE EACH</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          {[[CY,"⬡ Choose Cypress",["New team / easier learning curve","JavaScript / TypeScript only shop","Component testing is a priority","Best time-travel debugger","Smaller project, simpler needs"]],[PW,"▶ Choose Playwright",["Safari/WebKit cross-browser required","Multi-tab, OAuth, popup flows exist","Python, Java, or C# team","Free parallel execution at scale","Complex multi-role auth patterns"]]].map(([c, t, items]) => (
            <div key={t}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: c, marginBottom: "8px" }}>{t}</div>
              {items.map(it => (
                <div key={it} style={{ fontSize: "11px", color: "#6060a0", marginBottom: "4px", paddingLeft: "10px", borderLeft: `2px solid ${c}44` }}>{it}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RAPane() {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
        <div style={{ fontSize: "18px", fontWeight: 800, color: "#f0f0ff" }}>RestAssured</div>
        <span style={{ fontSize: "10px", color: "#555570", fontFamily: "monospace", background: RA + "18", padding: "2px 9px", borderRadius: "10px", border: `1px solid ${RA}33` }}>Java</span>
      </div>
      <div style={{ fontSize: "11px", color: "#555570", marginBottom: "16px" }}>API Testing with JUnit 5 and Maven</div>
      <TipBar tips={RA_TIPS} color={RA} />
      <div style={{ background: "#0a0a18", border: "1px solid #1a1a2a", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ padding: "11px 16px", borderBottom: "1px solid #1a1a2a", fontSize: "9px", fontWeight: 700, letterSpacing: "2px", color: RA, fontFamily: "monospace" }}>QUICK REFERENCE</div>
        {RA_QUICK.map(([label, code], i) => (
          <div key={i} style={{ padding: "9px 16px", borderBottom: i < RA_QUICK.length - 1 ? "1px solid #0e0e1a" : "none", display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: "#444460", minWidth: "100px", flexShrink: 0, fontWeight: 600 }}>{label}</span>
            <code style={{ fontSize: "11px", color: "#9090c0", fontFamily: "'JetBrains Mono',monospace", flex: 1, lineHeight: 1.5 }}>{code}</code>
            <CopyBtn text={code} />
          </div>
        ))}
      </div>
    </div>
  );
}

const TABS = [
  { id:"cypress",     label:"Cypress",     icon:"⬡", color: CY },
  { id:"playwright",  label:"Playwright",  icon:"▶", color: PW },
  { id:"compare",     label:"Compare",     icon:"⇄", color: YL },
  { id:"restassured", label:"RestAssured", icon:"☕", color: RA },
];

const CY_TIPS = [
  "Cypress runs IN the browser — same event loop as your app. Its biggest architectural difference from Selenium.",
  "cy.intercept() replaced cy.route() in v6+ — interviewers love asking about this specific change.",
  "No native multi-tab or multi-origin support — know this limitation and the workarounds.",
  "Custom commands go in cypress/support/commands.js — shows you know project structure.",
  "cy.clock() / cy.tick() for time control — shows advanced knowledge of test isolation.",
];

const PW_TIPS = [
  "Playwright uses async/await throughout — tests read like step-by-step user interactions.",
  "Built-in auto-wait on ALL actions AND locators — rarely need waitForSelector.",
  "Supports multi-page, multi-tab, and multi-origin natively — Cypress cannot do this.",
  "Codegen tool generates tests by recording browser actions — always mention this.",
  "playwright.config.ts projects[] runs across all browsers simultaneously for free.",
];

export default function App() {
  const [tab, setTab] = useState("cypress");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const q = search.toLowerCase();
    const found = [];
    [[CYPRESS_SECTIONS, "Cypress", CY],[PLAYWRIGHT_SECTIONS, "Playwright", PW]].forEach(([secs, name, color]) => {
      secs.forEach(sec => {
        sec.items.forEach(item => {
          if (item.q.toLowerCase().includes(q) || item.code.toLowerCase().includes(q) || (item.note && item.note.toLowerCase().includes(q))) {
            found.push({ name, color, sec: sec.title, item });
          }
        });
      });
    });
    setResults(found.slice(0, 7));
  }, [search]);

  const active = TABS.find(t => t.id === tab);

  return (
    <div style={{ minHeight: "100vh", background: "#060610", color: "#e0e0ff", fontFamily: "'DM Sans',-apple-system,sans-serif", display: "flex" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400&display=swap');*{box-sizing:border-box}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:#202035;border-radius:2px}button{transition:all .15s;outline:none}`}</style>

      {/* Sidebar */}
      <div style={{ width: "185px", flexShrink: 0, background: "#08081a", borderRight: "1px solid #12122a", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "18px 15px 14px", borderBottom: "1px solid #12122a" }}>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#f0f0ff", letterSpacing: "-0.3px" }}>QA Interview Prep</div>
          <div style={{ fontSize: "9px", color: "#252545", fontFamily: "monospace", letterSpacing: "1px", marginTop: "3px" }}>By Michael Ruiz</div>
        </div>
        <nav style={{ padding: "12px 8px", flex: 1 }}>
          <div style={{ fontSize: "9px", color: "#252545", fontFamily: "monospace", letterSpacing: "1.5px", padding: "3px 7px 8px" }}>FRAMEWORKS</div>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ width: "100%", background: tab === t.id ? t.color + "12" : "transparent", border: `1px solid ${tab === t.id ? t.color + "35" : "transparent"}`, borderRadius: "7px", padding: "9px 11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "9px", marginBottom: "2px" }}>
              <span style={{ fontSize: "13px" }}>{t.icon}</span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: tab === t.id ? "#f0f0ff" : "#555570" }}>{t.label}</span>
              {tab === t.id && <div style={{ marginLeft: "auto", width: "4px", height: "4px", borderRadius: "50%", background: t.color, flexShrink: 0 }} />}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 15px", borderTop: "1px solid #12122a", fontSize: "9px", color: "#252545", lineHeight: 1.6 }}>
          Active: <span style={{ color: active?.color }}>{active?.label}</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Top bar */}
        <div style={{ padding: "14px 26px", borderBottom: "1px solid #12122a", background: "#08081a", display: "flex", alignItems: "center", gap: "14px", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: "380px" }}>
            <span style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", fontSize: "11px", color: "#252545" }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search topics, methods, interview Q&A..."
              style={{ width: "100%", background: "#0c0c1c", border: "1px solid #1a1a2c", borderRadius: "7px", padding: "7px 11px 7px 30px", color: "#c0c0e0", fontSize: "12px", outline: "none", fontFamily: "inherit" }} />
            {results.length > 0 && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, width: "460px", background: "#0e0e1e", border: "1px solid #1a1a2a", borderRadius: "8px", overflow: "hidden", zIndex: 100, boxShadow: "0 8px 30px #00000088" }}>
                {results.map((r, i) => (
                  <button key={i} onClick={() => { setTab(r.name === "Cypress" ? "cypress" : "playwright"); setSearch(""); }}
                    style={{ width: "100%", background: "transparent", border: "none", borderBottom: i < results.length - 1 ? "1px solid #12122a" : "none", padding: "9px 13px", cursor: "pointer", display: "flex", gap: "9px", alignItems: "flex-start", textAlign: "left" }}>
                    <span style={{ fontSize: "9px", fontWeight: 700, color: r.color, background: r.color + "18", padding: "2px 6px", borderRadius: "3px", fontFamily: "monospace", flexShrink: 0, marginTop: "1px" }}>{r.name.toUpperCase()}</span>
                    <div>
                      <div style={{ fontSize: "12px", color: "#c0c0e0", fontWeight: 600 }}>{r.item.q}</div>
                      <div style={{ fontSize: "10px", color: "#35354a" }}>{r.sec}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ background: active?.color + "18", border: `1px solid ${active?.color}33`, padding: "5px 13px", borderRadius: "20px", fontSize: "11px", color: active?.color, fontWeight: 700, flexShrink: 0 }}>
            {active?.icon} {active?.label}
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding: "26px", maxWidth: "840px", margin: "0 auto" }}>
          {tab === "cypress"     && <ToolPane sections={CYPRESS_SECTIONS}    tips={CY_TIPS} color={CY} label="Cypress"    version="13.x" />}
          {tab === "playwright"  && <ToolPane sections={PLAYWRIGHT_SECTIONS} tips={PW_TIPS} color={PW} label="Playwright" version="1.4x" />}
          {tab === "compare"     && <ComparePane />}
          {tab === "restassured" && <RAPane />}
        </div>
      </div>
    </div>
  );
}
