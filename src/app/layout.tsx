import './globals.css'
import Providers from '../components/Providers'

export const metadata = {
  title: 'Thrill Lottery',
  description: 'Fast, fair, and thrilling lottery experiences — small bets, big dreams.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
