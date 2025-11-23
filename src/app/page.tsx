import Header from '../components/Header'
import Hero from '../components/Hero'
import HowItWorks from '../components/HowItWorks'
import Giftable from '../components/Giftable'
import FeelGood from '../components/FeelGood'
import Tickets from '../components/Tickets'
import ProvablyFair from '../components/ProvablyFair'
import Footer from '../components/Footer'

export default function Page() {
  return (
    <main>
        <Header />
        <Hero />
        <Tickets />
        <HowItWorks />
        <Giftable />
        <FeelGood />
        <ProvablyFair />
        <Footer />
    </main>
  )
}
