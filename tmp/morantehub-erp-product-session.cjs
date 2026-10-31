const path = require("path");
const Module = require("module");
const bin = process.env.PATH.split(path.delimiter).find((entry) => /_npx.*node_modules[/\\]\.bin/i.test(entry))
  || path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx", "31e32ef8478fbf80", "node_modules", ".bin");
if (!bin) throw new Error("Could not locate the temporary Playwright package");
process.env.NODE_PATH = path.resolve(bin, "..");
Module._initPaths();
const { chromium } = require("playwright");
const readline = require("readline");
const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL;
const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
if (!email || !password) throw new Error("Development operator credentials are unavailable");
const safe = (value) => String(value || "").replaceAll(email, "[operator]").replaceAll(password, "[redacted]");

(async () => {
  const browser = await chromium.launch({ headless: false, channel: "chrome" });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("http://localhost:5173/login");
  await page.getByPlaceholder("exemplo@email.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /Entrar no Sistema/ }).click();
  await page.waitForTimeout(3000);
  if (new URL(page.url()).pathname === "/login") {
    const text = safe(await page.locator("body").innerText());
    console.log("LOGIN_STATE " + JSON.stringify({ url: page.url(), text: text.slice(0, 1600) }));
  } else {
    await page.goto("http://localhost:5173/products");
    await page.waitForTimeout(2000);
    const text = safe(await page.locator("body").innerText());
    console.log("LOGIN_STATE " + JSON.stringify({ url: page.url(), title: await page.title(), text: text.slice(0, 4500) }));
  }

  const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of input) {
    try {
      const command = JSON.parse(line);
      if (command.action === "goto") await page.goto(command.url);
      else if (command.action === "clickText") await page.getByText(command.text, { exact: command.exact ?? true }).first().click();
      else if (command.action === "clickButton") await page.getByRole("button", { name: command.name }).first().click();
      else if (command.action === "clickRole") await page.getByRole(command.role, { name: command.name }).first().click();
      else if (command.action === "clickDomRole") await page.getByRole(command.role, { name: command.name }).first().evaluate((element) => element.click());
      else if (command.action === "clickDomRoleIndex") await page.getByRole(command.role, { name: command.name }).nth(command.index).evaluate((element) => element.click());
      else if (command.action === "fillPlaceholderIndex") await page.getByPlaceholder(command.placeholder).nth(command.index).fill(command.value);
      else if (command.action === "clickDomText") await page.getByText(command.text, { exact: command.exact ?? true }).first().evaluate((element) => element.click());
      else if (command.action === "fillPlaceholder") await page.getByPlaceholder(command.placeholder).fill(command.value);
      else if (command.action === "fillLabel") await page.getByLabel(command.label).fill(command.value);
      else if (command.action === "press") await page.keyboard.press(command.key);
      else if (command.action === "wait") await page.waitForTimeout(command.ms ?? 1000);
      else if (command.action === "body") {
        const text = safe(await page.locator("body").innerText());
        console.log("STATE " + JSON.stringify({ url: page.url(), title: await page.title(), text: text.slice(0, command.limit ?? 7000) }));
      } else if (command.action === "controls") {
        const data = await page.locator("input,textarea,select,button,[role=button]").evaluateAll((elements) => elements.slice(0, 140).map((element) => ({ tag: element.tagName, type: element.getAttribute("type"), name: element.getAttribute("name"), placeholder: element.getAttribute("placeholder"), aria: element.getAttribute("aria-label"), text: (element.innerText || "").trim().slice(0, 80) })));
        console.log("CONTROLS " + JSON.stringify(data));
      } else if (command.action === "domButtons") {
        const data = await page.locator("button").evaluateAll((elements) => elements.map((element, index) => ({ index, aria: element.getAttribute("aria-label"), text: (element.innerText || "").trim().slice(0, 100), disabled: element.disabled, visible: Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length) })));
        console.log("BUTTONS " + JSON.stringify(data));
      } else if (command.action === "domFields") {
        const data = await page.locator("input,textarea,select").evaluateAll((elements) => elements.map((element, index) => ({ index, tag: element.tagName, type: element.getAttribute("type"), placeholder: element.getAttribute("placeholder"), aria: element.getAttribute("aria-label"), value: element.value, disabled: element.disabled, visible: Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length) })));
        console.log("FIELDS " + JSON.stringify(data.map((item) => ({ ...item, value: safe(item.value) }))));
      } else if (command.action === "clickDomButton") {
        const result = await page.locator("button").nth(command.index).evaluate((element) => { const data = { aria: element.getAttribute("aria-label"), text: (element.innerText || "").trim().slice(0, 100) }; element.click(); return data; });
        console.log("CLICKED_BUTTON " + JSON.stringify(result));
      } else if (command.action === "fillDomField") {
        await page.locator("input,textarea,select").nth(command.index).fill(command.value);
      } else if (command.action === "close") {
        await browser.close();
        process.exit(0);
      }
      console.log("DONE " + command.action);
    } catch (error) {
      console.log("ACTION_ERROR " + JSON.stringify(safe(error.message)));
    }
  }
})().catch((error) => {
  console.log("SESSION_ERROR " + JSON.stringify(safe(error.message)));
  process.exitCode = 1;
});
