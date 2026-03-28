"use client";

export function DashboardPreview() {
  return (
    <div
      className="w-full max-w-[1100px] mx-auto px-10 relative"
      style={{ backgroundColor: "var(--bg)", paddingTop: "80px", paddingBottom: "80px" }}
    >
      <div
        className="rounded-[14px] overflow-hidden border relative"
        style={{
          borderColor: "var(--bdr)",
          backgroundColor: "var(--s1)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,.02), 0 24px 80px rgba(0,0,0,.5), 0 4px 16px rgba(0,0,0,.3)",
        }}
      >
        {/* Glow accent at top */}
        <div
          className="absolute top-[-1px] h-[1px]"
          style={{
            left: "80px",
            right: "80px",
            background: "linear-gradient(90deg, transparent, rgba(124,106,240,.3), transparent)",
          }}
        />

        {/* Browser Bar */}
        <div
          className="h-[36px] flex items-center px-[14px] gap-[7px]"
          style={{ backgroundColor: "var(--s2)", borderBottom: "1px solid var(--bdr)" }}
        >
          <div
            className="w-[9px] h-[9px] rounded-full border"
            style={{ backgroundColor: "var(--s3)", borderColor: "var(--bdr)" }}
          />
          <div
            className="w-[9px] h-[9px] rounded-full border"
            style={{ backgroundColor: "var(--s3)", borderColor: "var(--bdr)" }}
          />
          <div
            className="w-[9px] h-[9px] rounded-full border"
            style={{ backgroundColor: "var(--s3)", borderColor: "var(--bdr)" }}
          />
          <div
            className="ml-[12px] flex-1 h-[22px] flex items-center px-[10px] rounded-[5px] border"
            style={{
              backgroundColor: "var(--bg)",
              borderColor: "var(--bdr-lt)",
              font: "400 10px var(--mono)",
              color: "var(--tx3)",
            }}
          >
            app.realhq.com/dashboard
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-[170px_1fr] min-h-[460px]">
          {/* Sidebar */}
          <div
            className="px-[10px] py-[16px]"
            style={{ backgroundColor: "var(--s1)", borderRight: "1px solid var(--bdr)" }}
          >
            <div
              className="mb-[18px] px-[6px]"
              style={{ fontFamily: "var(--serif)", fontSize: "14px", color: "var(--tx)" }}
            >
              <span style={{ color: "var(--acc)", fontStyle: "italic" }}>R</span>ealHQ
            </div>

            <div
              className="px-[6px] mb-[6px]"
              style={{
                font: "500 8px/1 var(--mono)",
                color: "var(--tx3)",
                textTransform: "uppercase",
                letterSpacing: "1.6px",
              }}
            >
              Overview
            </div>
            <div
              className="px-[8px] py-[6px] rounded-[6px] mb-[1px] flex items-center justify-between"
              style={{
                backgroundColor: "var(--acc-lt)",
                color: "var(--acc)",
                font: "600 11px var(--sans)",
              }}
            >
              Dashboard
            </div>
            <div
              className="px-[8px] py-[6px] rounded-[6px] mb-[1px] flex items-center justify-between"
              style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}
            >
              Properties{" "}
              <span
                className="px-[5px] py-[2px] rounded-[4px] border"
                style={{
                  font: "500 8px/1 var(--mono)",
                  backgroundColor: "var(--s3)",
                  color: "var(--tx3)",
                  borderColor: "var(--bdr)",
                }}
              >
                5
              </span>
            </div>

            <div className="h-[14px]" />

            <div
              className="px-[6px] mb-[6px]"
              style={{
                font: "500 8px/1 var(--mono)",
                color: "var(--tx3)",
                textTransform: "uppercase",
                letterSpacing: "1.6px",
              }}
            >
              Reduce
            </div>
            <div
              className="px-[8px] py-[6px] rounded-[6px] mb-[1px]"
              style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}
            >
              Insurance
            </div>
            <div
              className="px-[8px] py-[6px] rounded-[6px] mb-[1px]"
              style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}
            >
              Energy
            </div>
            <div
              className="px-[8px] py-[6px] rounded-[6px] mb-[1px] flex items-center justify-between"
              style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}
            >
              Compliance{" "}
              <span
                className="px-[5px] py-[2px] rounded-[4px] border"
                style={{
                  font: "500 8px/1 var(--mono)",
                  backgroundColor: "var(--red-lt)",
                  color: "var(--red)",
                  borderColor: "var(--red-bdr)",
                }}
              >
                6
              </span>
            </div>

            <div className="h-[14px]" />

            <div
              className="px-[6px] mb-[6px]"
              style={{
                font: "500 8px/1 var(--mono)",
                color: "var(--tx3)",
                textTransform: "uppercase",
                letterSpacing: "1.6px",
              }}
            >
              Optimise
            </div>
            <div
              className="px-[8px] py-[6px] rounded-[6px] mb-[1px] flex items-center justify-between"
              style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}
            >
              Rent Reviews{" "}
              <span
                className="px-[5px] py-[2px] rounded-[4px] border"
                style={{
                  font: "500 8px/1 var(--mono)",
                  backgroundColor: "var(--s3)",
                  color: "var(--tx3)",
                  borderColor: "var(--bdr)",
                }}
              >
                5
              </span>
            </div>
            <div
              className="px-[8px] py-[6px] rounded-[6px] mb-[1px]"
              style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}
            >
              Hold vs Sell
            </div>

            <div className="h-[14px]" />

            <div
              className="px-[6px] mb-[6px]"
              style={{
                font: "500 8px/1 var(--mono)",
                color: "var(--tx3)",
                textTransform: "uppercase",
                letterSpacing: "1.6px",
              }}
            >
              Grow
            </div>
            <div
              className="px-[8px] py-[6px] rounded-[6px] mb-[1px] flex items-center justify-between"
              style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}
            >
              Deal Finder{" "}
              <span
                className="px-[5px] py-[2px] rounded-[4px] border"
                style={{
                  font: "500 8px/1 var(--mono)",
                  backgroundColor: "var(--s3)",
                  color: "var(--tx3)",
                  borderColor: "var(--bdr)",
                }}
              >
                11
              </span>
            </div>
            <div
              className="px-[8px] py-[6px] rounded-[6px] mb-[1px] flex items-center justify-between"
              style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}
            >
              Pipeline{" "}
              <span
                className="px-[5px] py-[2px] rounded-[4px] border"
                style={{
                  font: "500 8px/1 var(--mono)",
                  backgroundColor: "var(--s3)",
                  color: "var(--tx3)",
                  borderColor: "var(--bdr)",
                }}
              >
                3
              </span>
            </div>
          </div>

          {/* Main Content */}
          <div className="px-[26px] py-[22px]">
            <div
              className="mb-[6px]"
              style={{
                font: "400 8px/1 var(--mono)",
                color: "var(--tx3)",
                textTransform: "uppercase",
                letterSpacing: "1.8px",
              }}
            >
              Tuesday 25 March 2026
            </div>
            <div
              className="mb-[3px]"
              style={{
                fontFamily: "var(--serif)",
                fontSize: "20px",
                color: "var(--tx)",
              }}
            >
              Good morning, Ian
            </div>
            <div
              className="mb-[18px]"
              style={{ font: "300 11px var(--sans)", color: "var(--tx3)" }}
            >
              5 properties · $34.9M portfolio · here&apos;s what matters today.
            </div>

            {/* KPIs Grid */}
            <div
              className="grid grid-cols-4 gap-[1px] mb-[18px] rounded-[8px] overflow-hidden border"
              style={{ backgroundColor: "var(--bdr)", borderColor: "var(--bdr)" }}
            >
              <div className="p-[14px]" style={{ backgroundColor: "var(--s1)" }}>
                <div
                  className="mb-[6px]"
                  style={{
                    font: "500 7px/1 var(--mono)",
                    color: "var(--tx3)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Portfolio Value
                </div>
                <div
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: "22px",
                    color: "var(--tx)",
                    letterSpacing: "-.03em",
                    lineHeight: 1,
                  }}
                >
                  $34.9M
                </div>
                <div
                  className="mt-[4px]"
                  style={{ font: "400 9px var(--sans)", color: "var(--tx3)" }}
                >
                  <span style={{ color: "var(--grn)" }}>↑ 3.2%</span> YTD
                </div>
              </div>

              <div className="p-[14px]" style={{ backgroundColor: "var(--s1)" }}>
                <div
                  className="mb-[6px]"
                  style={{
                    font: "500 7px/1 var(--mono)",
                    color: "var(--tx3)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Net Income
                </div>
                <div
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: "22px",
                    color: "var(--tx)",
                    letterSpacing: "-.03em",
                    lineHeight: 1,
                  }}
                >
                  $2.3M{" "}
                  <small
                    style={{
                      fontFamily: "var(--sans)",
                      fontSize: "10px",
                      color: "var(--tx3)",
                      fontWeight: 400,
                    }}
                  >
                    /yr
                  </small>
                </div>
                <div
                  className="mt-[4px]"
                  style={{ font: "400 9px var(--sans)", color: "var(--tx3)" }}
                >
                  67% gross-to-net
                </div>
              </div>

              <div className="p-[14px]" style={{ backgroundColor: "var(--s1)" }}>
                <div
                  className="mb-[6px]"
                  style={{
                    font: "500 7px/1 var(--mono)",
                    color: "var(--tx3)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Uncaptured Value
                </div>
                <div
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: "22px",
                    color: "var(--tx)",
                    letterSpacing: "-.03em",
                    lineHeight: 1,
                  }}
                >
                  $921k{" "}
                  <small
                    style={{
                      fontFamily: "var(--sans)",
                      fontSize: "10px",
                      color: "var(--tx3)",
                      fontWeight: 400,
                    }}
                  >
                    /yr
                  </small>
                </div>
                <div
                  className="mt-[4px]"
                  style={{ font: "400 9px var(--sans)", color: "var(--amb)" }}
                >
                  4 savings found →
                </div>
              </div>

              <div className="p-[14px]" style={{ backgroundColor: "var(--s1)" }}>
                <div
                  className="mb-[6px]"
                  style={{
                    font: "500 7px/1 var(--mono)",
                    color: "var(--tx3)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Saved by RealHQ
                </div>
                <div
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: "22px",
                    color: "var(--tx)",
                    letterSpacing: "-.03em",
                    lineHeight: 1,
                  }}
                >
                  $249k
                </div>
                <div
                  className="mt-[4px] flex items-center gap-1"
                  style={{ font: "400 9px var(--sans)", color: "var(--tx3)" }}
                >
                  <span
                    className="inline-block w-[5px] h-[5px] rounded-full animate-pulse"
                    style={{ backgroundColor: "#34d399" }}
                  />
                  3 actions this year
                </div>
              </div>
            </div>

            {/* Gross to Net */}
            <div
              className="p-[14px] px-[16px] mb-[14px] rounded-[8px] border"
              style={{ backgroundColor: "var(--s1)", borderColor: "var(--bdr)" }}
            >
              <div className="flex justify-between items-baseline mb-[10px]">
                <div
                  style={{ font: "600 11px var(--sans)", color: "var(--tx)" }}
                >
                  Gross to Net
                </div>
                <div
                  style={{ font: "500 10px var(--sans)", color: "var(--acc)" }}
                >
                  Full breakdown →
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "28px",
                  color: "var(--tx)",
                  letterSpacing: "-.03em",
                }}
              >
                67%{" "}
                <small
                  style={{
                    fontFamily: "var(--sans)",
                    fontSize: "10px",
                    color: "var(--tx3)",
                    fontWeight: 400,
                  }}
                >
                  margin · benchmark 72–78%
                </small>
              </div>
              <div
                className="h-[4px] rounded-[2px] mt-[8px] relative"
                style={{ backgroundColor: "var(--s3)" }}
              >
                <div
                  className="h-full rounded-[2px]"
                  style={{ width: "67%", backgroundColor: "var(--acc)" }}
                />
                <div
                  className="absolute top-[-3px] h-[10px] w-[1px]"
                  style={{ left: "72%", backgroundColor: "var(--tx3)" }}
                />
                <div
                  className="absolute top-[-3px] h-[10px] w-[1px]"
                  style={{ left: "78%", backgroundColor: "var(--tx3)" }}
                />
              </div>
            </div>

            {/* Actions Table */}
            <div
              className="rounded-[8px] overflow-hidden border"
              style={{ backgroundColor: "var(--s1)", borderColor: "var(--bdr)" }}
            >
              <div
                className="px-[14px] py-[10px] flex justify-between items-center border-b"
                style={{ borderColor: "var(--bdr)" }}
              >
                <div
                  style={{ font: "600 11px var(--sans)", color: "var(--tx)" }}
                >
                  Money you&apos;re leaving on the table
                </div>
                <div
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: "16px",
                    color: "var(--tx)",
                    letterSpacing: "-.02em",
                  }}
                >
                  $921k{" "}
                  <small
                    style={{
                      fontFamily: "var(--sans)",
                      fontSize: "9px",
                      color: "var(--tx3)",
                    }}
                  >
                    /yr
                  </small>
                </div>
              </div>

              {[
                {
                  name: "Ancillary income — solar, EV, 5G",
                  sub: "Untapped revenue across 4 assets",
                  tag: "New income",
                  tagColor: "opp",
                  value: "$187k",
                },
                {
                  name: "Energy optimisation",
                  sub: "4 assets above FL benchmark",
                  tag: "Quick win",
                  tagColor: "quick",
                  value: "$156k",
                },
                {
                  name: "Insurance retender",
                  sub: "5 policies 15–25% above market",
                  tag: "Quick win",
                  tagColor: "quick",
                  value: "$93k",
                },
                {
                  name: "Rent uplift across 5 leases",
                  sub: "Below market — evidence ready",
                  tag: "Opportunity",
                  tagColor: "opp",
                  value: "$485k",
                },
              ].map((action, i, arr) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-[10px] px-[14px] py-[9px]"
                  style={{
                    borderBottom:
                      i < arr.length - 1 ? "1px solid var(--bdr-lt)" : "none",
                  }}
                >
                  <div>
                    <div
                      style={{
                        font: "500 10px var(--sans)",
                        color: "var(--tx)",
                      }}
                    >
                      {action.name}
                    </div>
                    <div
                      style={{
                        font: "300 9px var(--sans)",
                        color: "var(--tx3)",
                      }}
                    >
                      {action.sub}
                    </div>
                  </div>
                  <span
                    className="px-[6px] py-[2px] rounded-[4px] border whitespace-nowrap"
                    style={{
                      font: "500 7px/1 var(--mono)",
                      letterSpacing: ".3px",
                      ...(action.tagColor === "opp"
                        ? {
                            backgroundColor: "var(--acc-lt)",
                            color: "var(--acc)",
                            borderColor: "var(--acc-bdr)",
                          }
                        : {
                            backgroundColor: "var(--grn-lt)",
                            color: "var(--grn)",
                            borderColor: "var(--grn-bdr)",
                          }),
                    }}
                  >
                    {action.tag}
                  </span>
                  <span
                    style={{ font: "500 10px var(--mono)", color: "var(--tx)" }}
                  >
                    {action.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
