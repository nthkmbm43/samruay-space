import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Wrench, Home, CreditCard } from 'lucide-react';

export default function TenantLiffPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-primary px-6 pt-12 pb-8 rounded-b-3xl shadow-sm text-primary-foreground">
        <h1 className="text-2xl font-bold">Hello, Somchai!</h1>
        <p className="opacity-90 mt-1 flex items-center">
          <Home className="w-4 h-4 mr-1" />
          Room 302 • Samruay Space
        </p>
      </div>

      <div className="flex-1 px-6 pt-6 space-y-6">
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-lg">Current Bill</h2>
            <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-1 rounded-full">
              Due: 5 Aug
            </span>
          </div>
          
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal">August 2026</CardTitle>
              <div className="text-3xl font-bold">฿5,200.00</div>
            </CardHeader>
            <CardContent>
              <Button className="w-full mt-2" size="lg">
                <CreditCard className="w-4 h-4 mr-2" />
                Pay Now
              </Button>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-4">Services</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer active:scale-95 duration-200">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="font-medium text-sm">History</span>
              </CardContent>
            </Card>
            
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer active:scale-95 duration-200">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                  <Wrench className="w-6 h-6" />
                </div>
                <span className="font-medium text-sm">Repair</span>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
