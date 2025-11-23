"use client"
import { Box, Container, Flex, Heading, Text, Stack, Button } from '@chakra-ui/react'
export default function Hero() {
  return (
    <Box
      as="section"
      py={{ base: 10, md: 20 }}
      bgGradient="linear(to-t, gray.100 0%, white 100%)"
    >
      <Container maxW="6xl" py={{ base: 10, md: 19 }}>
        <Flex direction={{ base: 'column', md: 'row' }} align="center" gap={{ base: 8, md: 12 }}>
          {/* Left: dummy image */}
          <Box
            flex="1 1 0%"
            w={{ base: '100%', md: '45%' }}
            maxW={{ md: '340px', lg: '260px' }}
            mb={{ base: 8, md: 0 }}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="transparent"
            border="none"
            borderColor="transparent"
          >
            <img
              src="/hero_image.png"
              alt="Hero"
              style={{ width: '100%', height: 'auto' }}
            />
          </Box>
          {/* Right: text/buttons */}
          <Box flex="1 1 0%" w={{ base: '100%', md: '55%' }}>
            <Stack spacing={6} textAlign={{ base: 'center', md: 'left' }} color="gray.900">
              <Heading size="2xl">Small Bets. Massive Thrills.</Heading>
              <Text fontSize="lg" color="gray.700">
                Live draws, instant wins, and the pulse-racing excitement of a chance at life-changing prizes. It’s fast, fair, and designed to deliver pure thrill.
              </Text>
              <Stack direction={{ base: 'column', md: 'row' }} spacing={4} justify={{ base: 'center', md: 'flex-start' }}>
                <Button colorScheme="orange" size="lg">Buy a Ticket</Button>
                <Button variant="outline" size="lg">How it Works</Button>
              </Stack>
            </Stack>
          </Box>
        </Flex>
      </Container>
    </Box>
  );
}