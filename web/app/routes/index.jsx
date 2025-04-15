import { redirect } from "@remix-run/node";

export function loader() {
  return redirect("/app");
}

export default function Index() {
  return null;
} 