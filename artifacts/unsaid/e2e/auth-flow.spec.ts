import { expect, test } from '@playwright/test';

const session = {
  access_token: 'test-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'test-refresh-token',
  user: {
    id: '00000000-0000-0000-0000-000000000001',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'member@example.com',
    email_confirmed_at: '2026-09-03T00:00:00.000Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: '2026-09-03T00:00:00.000Z',
    updated_at: '2026-09-03T00:00:00.000Z',
  },
};

test('signed-out visitors are redirected from protected pages to login', async ({ page }) => {
  await page.goto('/chat');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Come back to yourself.' })).toBeVisible();
});

test('sign-up submits credentials and explains email confirmation', async ({ page }) => {
  let requestBody: { email?: string; password?: string } | undefined;

  await page.route('**/auth/v1/signup', async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          ...session.user,
          email: 'new-member@example.com',
          email_confirmed_at: null,
        },
        session: null,
      }),
    });
  });

  await page.goto('/signup');
  await page.getByTestId('input-auth-email').fill('new-member@example.com');
  await page.getByTestId('input-auth-password').fill('valid-password');
  await page.getByTestId('button-auth-submit').click();

  await expect(page.getByTestId('status-auth-notice')).toContainText('Check your email to confirm your account');
  expect(requestBody).toMatchObject({
    email: 'new-member@example.com',
    password: 'valid-password',
  });
});

test('invalid login credentials are rendered as an actionable error', async ({ page }) => {
  await page.route('**/auth/v1/token*', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'invalid_grant',
        error_description: 'Invalid login credentials',
        msg: 'Invalid login credentials',
      }),
    });
  });

  await page.goto('/login');
  await page.getByTestId('input-auth-email').fill('member@example.com');
  await page.getByTestId('input-auth-password').fill('wrong-password');
  await page.getByTestId('button-auth-submit').click();

  await expect(page.getByRole('alert')).toContainText('Invalid login credentials');
  await expect(page).toHaveURL(/\/login$/);
});

test('successful login redirects to chat', async ({ page }) => {
  await page.route('**/auth/v1/token*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session),
    });
  });

  await page.goto('/login');
  await page.getByTestId('input-auth-email').fill('member@example.com');
  await page.getByTestId('input-auth-password').fill('valid-password');
  await page.getByTestId('button-auth-submit').click();

  await expect(page).toHaveURL(/\/chat$/);
  await expect(page.getByRole('heading', { name: 'Say what you mean.' })).toBeVisible();
});