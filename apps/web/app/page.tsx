import { redirect } from "next/navigation";

export default function Home() {
  
  //if signin redirect it to /trade
  //if not show the dashboard
  
  redirect("/trade");
}