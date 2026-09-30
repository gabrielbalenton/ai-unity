/* Same-origin, pre-hydration theme resolver. No remote dependency. */
(function(){
 try{
  var raw=window.localStorage.getItem("unity-appearance-v1");
  var preference=raw==="light"||raw==="dark"?raw:"system";
  var dark=window.matchMedia("(prefers-color-scheme: dark)").matches;
  var resolved=preference==="system"?(dark?"dark":"light"):preference;
  document.documentElement.dataset.unityTheme=preference;
  document.documentElement.dataset.resolvedTheme=resolved;
 }catch{
  var fallbackDark=window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.unityTheme="system";
  document.documentElement.dataset.resolvedTheme=fallbackDark?"dark":"light";
 }
})();