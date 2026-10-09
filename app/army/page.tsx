import roster from "@/config/unity-army-roster.json";
import {buildArmySnapshot} from "@/lib/army/control-plane.mjs";
import UnityArmyOffice from "@/components/UnityArmyOffice";

export default function UnityArmyPage(){
 const snapshot=buildArmySnapshot(roster,[]);
 return <main style={{maxWidth:1480,margin:"0 auto",padding:"28px 20px",fontFamily:"system-ui,sans-serif"}}><UnityArmyOffice initialSnapshot={snapshot}/></main>;
}
