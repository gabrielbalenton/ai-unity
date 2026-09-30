import {test,expect} from "@playwright/test";
test("release readiness renders real gates with no fake verification and captures responsive UI",async({page},testInfo)=>{
 await page.goto("/");
 if(testInfo.project.name==="mobile-chromium")await page.getByRole("button",{name:"Open navigation"}).click();
 await page.getByRole("button",{name:"Readiness",exact:true}).click();
 await expect(page.locator("h1")).toHaveText("Readiness");
 await expect(page.getByText("RELEASE LOCKED",{exact:true}).first()).toBeVisible();
 await expect(page.getByText("Evidence before launch.")).toBeVisible();
 await expect(page.getByText("0 / 10")).toBeVisible();
 await page.getByRole("button",{name:"Dedicated backend and authentication"}).click();
 await expect(page.getByText("Two authenticated test accounts")).toBeVisible();
 await page.getByRole("button",{name:"Personal trial"}).click();
 await expect(page.getByText("Personal usage baseline")).toBeVisible();
 await page.screenshot({path:testInfo.outputPath("unity-release-readiness.png"),fullPage:true});
});
