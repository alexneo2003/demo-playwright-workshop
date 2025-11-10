import { test } from "@playwright/test";
import fs from "fs";
import { randomUUID } from "node:crypto";
import path from "path";
import { UserCreateRequest, UserCreatedResponse } from "../api/models";
import { Application } from "../app";

const STORAGE_STATE_PATH = path.join(__dirname, "../storage-state.json");

export const baseFixture = test.extend<{ app: Application }>({
  app: async ({ page }, use) => {
      const app = new Application(page);
      await use(app);
  },
});

export type DefaultUserOption = {
  defaultUser: {
    email: string;
    password: string;
  };
};

export const loggedUserFixture = baseFixture.extend<
  DefaultUserOption & { app: Application }
>({
  defaultUser: [
    {
      email: "test+e1f76f13-0f04-4f2e-86d8-0e78e3df2ddd@test.com",
      password: "xotabu4@gmail.com",
    },
    {
      option: true,
    },
  ],
  app: async ({ app, browser, defaultUser }, use) => {
    if (fs.existsSync(STORAGE_STATE_PATH)) {
      await app._page.context().close();
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      const page = await context.newPage();
      const appWithStorage = new Application(page);
      await appWithStorage.home.open();
      await appWithStorage.home.header.openShop();
      await use(appWithStorage);
      await context.close();
    } else {
      await app.signIn.open();
      await app.signIn.signIn(defaultUser);
      await app.accountDetails.expectLoaded();
      await app.home.header.openShop();
      await app._page.context().storageState({ path: STORAGE_STATE_PATH });
      await use(app);
    }
  },
});

interface UserContext {
  user: { userModel: UserCreateRequest; createdUser: UserCreatedResponse };
}

export const loggedInAsNewUserFixture = baseFixture.extend<UserContext>({
  user: async ({ app }, use) => {
    const userModel = {
      isSubscribed: false,
      email: `test+${randomUUID()}@test.com`,
      firstName: "test",
      lastName: "test",
      password: "xotabu4@gmail.com",
    };

    const createdUser = await app.api.auth.createNewUser(userModel);
    await app.headlessLogin(userModel);
    await app.home.open();

    await use({ userModel, createdUser });
  },
});
