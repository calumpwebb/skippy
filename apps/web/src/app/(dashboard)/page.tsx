import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Welcome to Skippy</h1>
      <p className="text-muted-foreground">
        Your Arc Raiders companion for game data and AI assistance.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Browse weapons, armor, and consumables.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Traders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Find trader inventories and prices.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Track quest objectives and rewards.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Ask Skippy anything about Arc Raiders.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
