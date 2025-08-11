<script lang="ts">
  import * as Card from '@repo/ui/card';
  import { Button } from '@repo/ui/button';
  
  type Props = {
    emoji: string;
    title: string;
    description: string;
    href: string;
  };
  
  let { emoji, title, description, href }: Props = $props();
</script>

<Card.Root class="hover:shadow-md transition-shadow">
  <Card.Content>
    <Card.Header class="pb-4">
      <div class="flex items-center gap-3">
        <span class="text-2xl">{emoji}</span>
        <Card.Title class="text-xl">{title}</Card.Title>
      </div>
    </Card.Header>
    <Card.Description class="mb-4">
      {description}
    </Card.Description>
    <Button href={href} variant="link" class="p-0 h-auto font-medium">
      Try it now →
    </Button>
  </Card.Content>
</Card.Root>