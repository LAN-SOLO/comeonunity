import * as React from 'react'

interface BaseEmailProps {
  previewText?: string
  children: React.ReactNode
}

export function BaseEmail({ previewText, children }: BaseEmailProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{previewText || 'ComeOnUnity'}</title>
        <style>
          {`
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f4f4f5;
              margin: 0;
              padding: 0;
              -webkit-text-size-adjust: 100%;
              -ms-text-size-adjust: 100%;
            }
            .wrapper {
              background-color: #f4f4f5;
              padding: 40px 20px;
            }
            .container {
              max-width: 560px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            .header {
              background-color: #18181b;
              padding: 24px 32px;
              text-align: center;
            }
            .logo {
              color: #ffffff;
              font-size: 24px;
              font-weight: 700;
              text-decoration: none;
            }
            .content {
              padding: 32px;
            }
            .footer {
              padding: 24px 32px;
              text-align: center;
              color: #71717a;
              font-size: 12px;
              border-top: 1px solid #e4e4e7;
            }
            h1 {
              color: #18181b;
              font-size: 24px;
              font-weight: 600;
              margin: 0 0 16px 0;
            }
            p {
              color: #3f3f46;
              font-size: 15px;
              line-height: 1.6;
              margin: 0 0 16px 0;
            }
            .button {
              display: inline-block;
              background-color: #18181b;
              color: #ffffff !important;
              text-decoration: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-weight: 500;
              font-size: 15px;
              margin: 8px 0;
            }
            .button:hover {
              background-color: #27272a;
            }
            .text-muted {
              color: #71717a;
              font-size: 13px;
            }
            .divider {
              border: none;
              border-top: 1px solid #e4e4e7;
              margin: 24px 0;
            }
          `}
        </style>
      </head>
      <body>
        {previewText && (
          <div style={{ display: 'none', maxHeight: 0, overflow: 'hidden' }}>
            {previewText}
          </div>
        )}
        <div className="wrapper">
          <div className="container">
            <div className="header">
              <span className="logo">ComeOnUnity</span>
            </div>
            <div className="content">{children}</div>
            <div className="footer">
              <p style={{ margin: 0 }}>
                &copy; {new Date().getFullYear()} ComeOnUnity. All rights reserved.
              </p>
              <p style={{ margin: '8px 0 0 0' }}>
                This email was sent to you because you have an account on ComeOnUnity.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}

/**
 * Render email to HTML string
 */
export function renderEmail(component: React.ReactElement): string {
  // Simple React to HTML rendering without external dependencies
  const ReactDOMServer = require('react-dom/server')
  return '<!DOCTYPE html>' + ReactDOMServer.renderToStaticMarkup(component)
}
