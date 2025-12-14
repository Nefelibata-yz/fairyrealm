import { getBooks } from "@/app/lib/db";
import { HomeClient } from "./home-client";

export const runtime = 'edge';

export default async function Home() {
  const books = await getBooks();

  return <HomeClient books={books} />;
}
