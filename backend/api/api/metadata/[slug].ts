import handleById from "../../metadata/[agentId]";
import handleByName from "../../metadata/[agentName]";

type VercelRequest = {
  query: Record<string, string | string[]>;
};

export default async function handler(req: VercelRequest, res: unknown) {
  const rawSlug = req.query["slug"];
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;

  if (typeof slug !== "string" || slug.length === 0) {
    return handleByName(
      { ...(req as object), query: { ...req.query, agentName: "" } } as never,
      res as never,
    );
  }

  if (/^[0-9a-f]{64}$/i.test(slug)) {
    return handleById(
      { ...(req as object), query: { ...req.query, agentId: slug } } as never,
      res as never,
    );
  }

  return handleByName(
    { ...(req as object), query: { ...req.query, agentName: slug } } as never,
    res as never,
  );
}
