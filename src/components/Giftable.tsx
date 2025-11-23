"use client"
import { Box, Container, Flex, Heading, Text, Stack } from '@chakra-ui/react'

export default function Giftable() {
  return (
    <Box as="section" py={12} bg="white">
      <Container maxW="6xl">
        <Flex direction={{ base: 'column', md: 'row' }} align="center" gap={{ base: 8, md: 12 }}>
          {/* Right: text */}
          <Box flex="1 1 0%" w={{ base: '100%', md: '60%' }}>
            <Stack spacing={6} textAlign={{ base: 'center', md: 'left' }}>
              <Heading size="lg">Gift Tickets to Friends</Heading>
              <Text fontSize="lg" color="gray.700" maxW="2xl">
                Lottery tickets aren’t just for you — you can send them to friends and family as a surprise! Our tickets are digital collectibles, so you can easily gift a chance to win big. It’s a fun way to share the thrill and excitement with the people you care about.
              </Text>
            </Stack>
          </Box>
          {/* Left: image */}
          <Box
            flex="1 1 0%"
            w={{ base: '100%', md: '40%' }}
            maxW={{ md: '320px', lg: '340px' }}
            mb={{ base: 8, md: 0 }}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="transparent"
            borderRadius="1.25rem"
            overflow="hidden"
          >
            <img
              src="/giftable.png"
              alt="Gift a ticket"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </Box>
        </Flex>
      </Container>
    </Box>
  );
}
