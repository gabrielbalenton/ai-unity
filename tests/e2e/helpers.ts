import type {Page} from "@playwright/test";

export async function openPrimary(page:Page,label:string,isMobile:boolean){
 if(isMobile)await page.getByRole("button",{name:"Open navigation"}).click();
 const nav=page.getByRole("navigation",{name:"Primary navigation",exact:true});
 await nav.getByRole("button",{name:label,exact:true}).click();
}
export async function openAdvanced(page:Page,label:string,isMobile:boolean){
 if(isMobile)await page.getByRole("button",{name:"Open navigation"}).click();
 const nav=page.getByRole("navigation",{name:"Primary navigation",exact:true});
 const more=nav.getByRole("button",{name:"More",exact:true});
 if(await more.getAttribute("aria-expanded")!=="true")await more.click();
 await nav.getByRole("button",{name:label,exact:true}).click();
}
export async function openAppearance(page:Page,isMobile:boolean){
 if(isMobile){
  await openPrimary(page,"Settings",true);
  return page.getByRole("combobox",{name:"Appearance"}).last();
 }
 return page.getByRole("combobox",{name:"Appearance"}).first();
}
