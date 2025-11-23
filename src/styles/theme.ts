import { extendTheme, type ThemeConfig } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false
}

const colors = {
  brand: {
    50: '#fff8f0',
    100: '#ffe8cc',
    500: '#ff6b35'
  }
}

const theme = extendTheme({ config, colors })

export default theme
