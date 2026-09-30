import {test,expect} from "@playwright/test";
import {openPrimary} from "./helpers";

test("conversation composer records a scoped local note with an accessible responsive flow",async({page,isMobile},testInfo)=>{
 await page.goto("/");
 await openPrimary(page,"Projects",isMobile);
 await page.getByRole("textbox",{name:"Name",exact:true}).fill("Conversation design test");
 await page.getByRole("textbox",{name:"Description"}).fill("Isolated browser-only workspace");
 await page.getByRole("button",{name:"Create project"}).click();
 await openPrimary(page,"Conversations",isMobile);
 await expect(page.getByText("Start with a thought.")).toBeVisible();
 const starter=page.getByRole("button",{name:"Capture an idea"});\n if(isMobile)await starter.tap(); else await starter.click();
 const composer=page.getByRole("textbox",{name:"Local conversation note"});
 await expect(composer).toHaveValue("Idea: ");
 await composer.fill("Idea: Create a durable universal workspace");
 await page.getByRole("button",{name:"Save note"}).click();
 await expect(page.getByText("Idea: Create a durable universal workspace")).toBeVisible();
 await expect(page.getByText("LOCAL NOTE · NOT SENT TO AI")).toBeVisible();
 await page.screenshot({path:testInfo.outputPath("unity-conversation-studio.png"),fullPage:true});
});
