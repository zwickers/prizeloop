"use client"
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import theme from '../styles/theme'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider theme={theme} resetCSS>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      {children}
    </ChakraProvider>
  )
}
