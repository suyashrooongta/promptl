import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  name: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if(req.method !== "POST") {
    res.status(405).send("This is a post call");
    return;
  }
  console.log(req.body);
  res.status(200).end();
}
