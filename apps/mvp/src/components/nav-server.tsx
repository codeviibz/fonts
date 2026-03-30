import { getSession } from "@/lib/auth";
import { Nav } from "./nav";

export async function NavServer() {
  const session = await getSession();
  return <Nav session={session} />;
}
