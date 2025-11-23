"use client"
import { Box, Container, Heading, SimpleGrid, Text, Stack } from '@chakra-ui/react'

function Step({ title, desc }: { title: string; desc: string }) {
  return (
    <Stack spacing={2} p={4} bg="white" rounded="lg" shadow="sm">
      <Heading size="sm">{title}</Heading>
      <Text color="gray.600">{desc}</Text>
    </Stack>
  )
}

export default function HowItWorks() {
  return (
    <Box as="section" py={12} bg="gray.50">
      <Container maxW="6xl">
        <Stack spacing={6} textAlign="center" mb={6}>
          <Heading>How it Works</Heading>
          <Text color="gray.600">Quick, transparent, and built to deliver excitement. Here's the basics.</Text>
        </Stack>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          <Step title="1. Buy or gift a Ticket" desc="Choose a ticket tier — small bet, big dream. Tickets are cheap and easy to grab. You can give your tickets away to friends!" />
          <Step title="2. Draw & Win" desc="Draws happen every week on Friday at 5pm EST. Winners are announced and payouts are FAST." />
          <Step title="3. Provably Fair" desc="Every draw is 100% fair and auditable. We publish the seeds and verification steps." />
        </SimpleGrid>
      </Container>
    </Box>
  )
}
