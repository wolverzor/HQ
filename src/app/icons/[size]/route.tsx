import { ImageResponse } from "next/og";

export const dynamic = "force-static";

type Params = { params: Promise<{ size: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { size: raw } = await params;
  const maskable = raw.includes("maskable");
  const size = parseInt(raw, 10) || 192;
  const padding = maskable ? Math.round(size * 0.18) : Math.round(size * 0.14);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: size - padding * 2,
            height: size - padding * 2,
          }}
        >
          <span
            style={{
              fontSize: (size - padding * 2) * 0.46,
              fontWeight: 700,
              color: "white",
              letterSpacing: -2,
              fontFamily: "sans-serif",
            }}
          >
            HQ
          </span>
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
