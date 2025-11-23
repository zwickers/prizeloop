"use client"
import { Box, Container, Text, Stack } from '@chakra-ui/react'

export default function Footer() {
  return (
    <Box
      as="footer"
      py={8}
      bgGradient="linear(to-t, gray.200 0%, white 100%)"
    >
      <Container maxW="6xl">
        <Stack spacing={2} align="center">
          <Box as="img" src="/prizeloop.png" alt="PrizeLoop" height="40px" />
          <Text fontSize="sm" color="gray.600">Play responsibly. This site is a fun demo and not financial advice.</Text>
        </Stack>
      </Container>
    </Box>
  )
}
