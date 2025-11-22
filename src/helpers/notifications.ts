const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export async function getFarcasterUser(address: string) {
  try {
    if (!NEYNAR_API_KEY) {
      throw Error("Neynar key not found");
    }

    const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`;
    const options = {
      method: "GET",
      headers: { "x-api-key": NEYNAR_API_KEY },
    };
    const response = await fetch(url, options);
    const farcasterUserData = (await response.json()) as Record<
      string,
      Array<{ username: string, fid: number }>
    >;
    return farcasterUserData?.[address.toLowerCase()]?.[0];
  } catch (error) {
    console.warn("Failed to fetch Farcaster user:", error);
  }
  return null;
}

export async function getCreatorDisplayName(address: string): Promise<string> {
  const farcasterUser = await getFarcasterUser(address);
  if (farcasterUser?.username) {
    return `@${farcasterUser.username}`;
  }
  return `${address.slice(0, 7)}`;
}

export async function sendNotification({
  title,
  messageBody,
  targetUrl,
  targetFIds = [],
}: {
  title: string;
  messageBody: string;
  targetUrl: string;
  targetFIds?: Array<number>;
}) {
  if (!NEYNAR_API_KEY) {
    throw Error("Neynar key not found");
  }

  const url = "https://api.neynar.com/v2/farcaster/frame/notifications/";

  const options = {
    method: "POST",
    headers: {
      "x-api-key": NEYNAR_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target_fids: targetFIds,
      notification: { title: title, body: messageBody, target_url: targetUrl },
    }),
  };

  let i = 3;
  while (i-- !== 0) {
    try {
      await (await fetch(url, options)).json();
      break;
    } catch (error) {
      console.error(error);
    }
  }
}
