import {test,expect} from "@playwright/test";
import {openAdvanced,openAppearance,openPrimary} from "./helpers";

test("approved Home is calm, honest and screenshot-ready",async({page},testInfo)=>{
 await page.goto("/");
 await expect(page.locator("h1")).toHaveText("Home");
 await expect(page.getByText("Welcome to UNITY.")).toBeVisible();
 await expect(page.getByPlaceholder("What would you like to work on?")).toBeVisible();
 await expect(page.getByText(/External execution and paid APIs remain disabled/)).toBeVisible();
 await expect(page.getByText("System overview")).toHaveCount(0);
 await page.screenshot({path:testInfo.outputPath("unity-home.png"),fullPage:true});
});

test("primary and advanced navigation both preserve working pages",async({page,isMobile})=>{
 await page.goto("/");
 await openPrimary(page,"Knowledge",isMobile);
 await expect(page.locator("h1")).toHaveText("Knowledge");
 await expect(page.getByText("Brain dump",{exact:true})).toBeVisible();
 await openAdvanced(page,"Integrations",isMobile);
 await expect(page.locator("h1")).toHaveText("Integrations");
 await expect(page.getByText("Universal connections")).toBeVisible();
});

test("System Light Dark control is available and manual modes apply",async({page,isMobile})=>{
 await page.goto("/");
 const appearance=await openAppearance(page,isMobile);
 await expect(appearance).toHaveValue("system");
 await appearance.selectOption("dark");
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","dark");
 await appearance.selectOption("light");
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","light");
});

test("project creation appears on the real Home without fake totals",async({page,isMobile})=>{
 await page.goto("/");
 await openPrimary(page,"Projects",isMobile);
 await page.getByRole("textbox",{name:"Name",exact:true}).fill("Design smoke test");
 await page.getByRole("textbox",{name:"Description"}).fill("Local test project");
 await page.getByRole("button",{name:"Create project"}).click();
 await expect(page.getByRole("button",{name:"Open project memory"})).toBeVisible();
 await openPrimary(page,"Home",isMobile);
 await expect(page.getByRole("button",{name:/Design smoke test/})).toBeVisible();
});

test("Automations is a dedicated room and remains inert",async({page,isMobile})=>{
 await page.goto("/");
 await openPrimary(page,"Projects",isMobile);
 await page.getByRole("textbox",{name:"Name",exact:true}).fill("Automation smoke test");
 await page.getByRole("textbox",{name:"Description"}).fill("Room separation");
 await page.getByRole("button",{name:"Create project"}).click();
 await openPrimary(page,"Automations",isMobile);
 await expect(page.locator("h1")).toHaveText("Automations");
 await page.getByRole("textbox",{name:"Name",exact:true}).fill("Morning briefing");
 await page.getByRole("textbox",{name:"What should happen"}).fill("Prepare yesterday's approved updates");
 await page.getByRole("button",{name:"Save draft"}).click();
 await expect(page.getByText("Morning briefing")).toBeVisible();
 await expect(page.getByRole("button",{name:"Run"})).toBeDisabled();
});

test("Settings owns backup and theme controls",async({page,isMobile})=>{
 await page.goto("/");
 await openPrimary(page,"Settings",isMobile);
 await expect(page.getByText("Backup and recovery")).toBeVisible();
 await expect(page.getByLabel("Appearance").last()).toBeVisible();
});
