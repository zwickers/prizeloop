"use client"
import { Box, Container, SimpleGrid, Heading, Text, Button, Stack, Stat, StatLabel, StatNumber } from '@chakra-ui/react'


function TicketCard({ name, price, entries, highlight }: { name: string; price: string; entries: string; highlight?: boolean }) {
  return (
    <Box
      p={6}
      bg={highlight ? 'yellow.50' : 'white'}
      rounded="xl"
      boxShadow="0 2px 16px 0 rgba(20,20,30,0.10), 0 -2px 8px 0 rgba(20,20,30,0.015)"
      border={highlight ? '2px solid gold' : undefined}
      position="relative"
    >
      <Stack spacing={4} align="center">
        <Heading size="md" color={highlight ? 'yellow.700' : undefined}>{name}</Heading>
        <Text color="gray.600" fontWeight="bold">{price}</Text>
        <Text color="gray.600">{entries} entries</Text>
        {highlight && (
          <Box position="absolute" top={2} right={4} fontSize="sm" color="yellow.600" fontWeight="bold">
            ★ Best Value
          </Box>
        )}
        <Button colorScheme={highlight ? 'yellow' : 'orange'}>Buy</Button>
      </Stack>
    </Box>
  );
}

export default function Tickets() {
  return (
    <Box as="section" py={12}>
      <Container maxW="6xl">
        <Stack spacing={6} mb={6} textAlign="center">
          <Heading>Tickets & Odds</Heading>
          <Text color="gray.600">
            Buy a digital ticket (an NFT collectible) for your shot at the jackpot! Every Friday, one lucky winner is chosen from all tickets sold that week. Tickets are affordable, easy to buy, and you can even gift them to friends. No crypto expertise needed—just join the fun and see if you’re the next big winner!
          </Text>
        </Stack>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <TicketCard name="Normal Ticket" price="1 USDC" entries="1" />
          <TicketCard name="Golden Ticket" price="25 USDC" entries="50" highlight />
        </SimpleGrid>

        <Stack direction="row" spacing={8} mt={8} justify="center">
          <Stat>
            <StatLabel>Next Draw</StatLabel>
            <StatNumber>In 02:13:45</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Current Pool</StatLabel>
            <StatNumber>$126,450</StatNumber>
          </Stat>
        </Stack>
      </Container>
    </Box>
  )
}
