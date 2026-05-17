type WindsorParams = {
  connector: string;
  accounts: string[];
  fields: string[];
  dateFrom: string;
  dateTo: string;
};

export async function fetchWindsorData({
  connector,
  accounts,
  fields,
  dateFrom,
  dateTo,
}: WindsorParams) {
  const params = new URLSearchParams();

  params.set("api_key", process.env["WINDSOR_API_KEY"] || "");
  params.set("connector", connector);
  params.set("accounts", accounts.join(","));
  params.set("fields", fields.join(","));
  params.set("date_from", dateFrom);
  params.set("date_to", dateTo);

  const url = `https://connectors.windsor.ai/all?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `Windsor API failed (${response.status}): ${text}`
    );
  }

  const json = await response.json();

  if (Array.isArray(json)) {
    return json;
  }

  if (Array.isArray(json.result)) {
    return json.result;
  }

  if (Array.isArray(json.data)) {
    return json.data;
  }

  throw new Error("Unexpected Windsor response shape");
}
