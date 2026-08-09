import { ImageResponse } from 'next/og';

// Next.js 16 deprecates the Edge Runtime; next/og runs on the Node.js runtime.
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract parameters
    const hasTitle = searchParams.has('title');
    const title = hasTitle
      ? searchParams.get('title')?.slice(0, 100)
      : 'DomainIntel';
    
    const hasDescription = searchParams.has('description');
    const description = hasDescription
      ? searchParams.get('description')?.slice(0, 200)
      : 'Modern Domain Intelligence & WHOIS Alternative';

    const hasDomain = searchParams.has('domain');
    const domain = hasDomain ? searchParams.get('domain')?.slice(0, 50) : null;

    const hasStatus = searchParams.has('status');
    const status = hasStatus ? searchParams.get('status') : null;

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0a',
            backgroundImage: 'radial-gradient(circle at 25px 25px, #333 2%, transparent 0%), radial-gradient(circle at 75px 75px, #333 2%, transparent 0%)',
            backgroundSize: '100px 100px',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 40,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                backgroundColor: '#3B82F6',
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 24,
              }}
            >
              <div
                style={{
                  color: 'white',
                  fontSize: 32,
                  fontWeight: 'bold',
                }}
              >
                ⚡
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 'bold',
                  color: 'white',
                  lineHeight: 1.2,
                }}
              >
                DomainIntel
              </div>
              <div
                style={{
                  fontSize: 18,
                  color: '#94A3B8',
                  lineHeight: 1.2,
                }}
              >
                Modern Domain Intelligence
              </div>
            </div>
          </div>

          {/* Domain info if provided */}
          {domain && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                borderRadius: 12,
                padding: '20px 32px',
                marginBottom: 32,
              }}
            >
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 'bold',
                  color: '#F8FAFC',
                  marginRight: 16,
                }}
              >
                🌐
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 'bold',
                    color: '#3B82F6',
                  }}
                >
                  {domain}
                </div>
                {status && (
                  <div
                    style={{
                      fontSize: 16,
                      color: '#10B981',
                      marginTop: 4,
                    }}
                  >
                    Status: {status}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              maxWidth: '800px',
              padding: '0 40px',
            }}
          >
            <div
              style={{
                fontSize: 42,
                fontWeight: 'bold',
                color: 'white',
                lineHeight: 1.3,
                marginBottom: 20,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 24,
                color: '#94A3B8',
                lineHeight: 1.4,
                marginBottom: 40,
              }}
            >
              {description}
            </div>
          </div>

          {/* Features */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 32,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: 16,
                color: '#10B981',
              }}
            >
              <div style={{ marginRight: 8 }}>✓</div>
              <div>Structured JSON</div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: 16,
                color: '#10B981',
              }}
            >
              <div style={{ marginRight: 8 }}>✓</div>
              <div>Privacy Compliant</div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: 16,
                color: '#10B981',
              }}
            >
              <div style={{ marginRight: 8 }}>✓</div>
              <div>Real-time Data</div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: 16,
                color: '#10B981',
              }}
            >
              <div style={{ marginRight: 8 }}>✓</div>
              <div>Free & Open Source</div>
            </div>
          </div>

          {/* Footer URL */}
          <div
            style={{
              position: 'absolute',
              bottom: 30,
              right: 30,
              fontSize: 16,
              color: '#64748B',
            }}
          >
            www.domainintel.in
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}