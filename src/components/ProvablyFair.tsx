"use client"
import { Box, Container, Heading, Text, Stack, Input, Button, Code } from '@chakra-ui/react'
import { useState } from 'react'

function djb2(str: string) {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i)
  }
  return h >>> 0
}

export default function ProvablyFair() {
  const [serverSeed] = useState(() => Math.random().toString(36).slice(2, 14))
  const [clientSeed, setClientSeed] = useState('your-seed')
  const [roll, setRoll] = useState<number | null>(null)

  function verify() {
    const h = djb2(serverSeed + clientSeed)
    const value = (h % 100) + 1
    setRoll(value)
  }

  return (
  <Box as="section" py={12} bg="white">
      <Container maxW="3xl" textAlign="center">
        <Stack spacing={4}>
          <Heading size="lg">Provably Fair — quick demo</Heading>
          <Text color="gray.600">We publish the server seed for each draw. Combine it with your client seed to reproduce the draw result. This demo shows the approach in a simplified way.</Text>

          <Stack direction={{ base: 'column', md: 'row' }} spacing={3} justify="center" align="center">
            <Code px={3} py={2} rounded="md">serverSeed: {serverSeed}</Code>
            <Input maxW={220} value={clientSeed} onChange={(e) => setClientSeed(e.target.value)} />
            <Button colorScheme="orange" onClick={verify}>Verify</Button>
          </Stack>

          <Text fontSize="xl">Result: {roll ?? '—'}</Text>
        </Stack>
      </Container>
    </Box>
  )
}
