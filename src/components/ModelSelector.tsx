import { AIML_MODEL_CONFIG, ModelInfo, DEFAULT_MODEL } from '@/config/modelConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, DollarSign, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  className?: string;
}

export const ModelSelector = ({ value, onChange, className }: ModelSelectorProps) => {
  const selectedModel = AIML_MODEL_CONFIG[value] || AIML_MODEL_CONFIG[DEFAULT_MODEL];

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case 'fast': return 'bg-green-500/20 text-green-600 dark:text-green-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400';
      case 'slow': return 'bg-red-500/20 text-red-600 dark:text-red-400';
      default: return 'bg-gray-500/20 text-gray-600 dark:text-gray-400';
    }
  };

  const getCostColor = (cost: string) => {
    switch (cost) {
      case 'low': return 'bg-green-500/20 text-green-600 dark:text-green-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400';
      case 'high': return 'bg-red-500/20 text-red-600 dark:text-red-400';
      default: return 'bg-gray-500/20 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block">
          Select AI Model for this Assistant
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.values(AIML_MODEL_CONFIG).map((model) => {
            const isSelected = value === model.shortId;
            return (
              <Card
                key={model.shortId}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-md border-2",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border/50 hover:border-primary/50"
                )}
                onClick={() => onChange(model.shortId)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        {model.label}
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {model.provider}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {model.bestFor}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={cn("text-xs", getSpeedColor(model.speed))}
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      {model.speed}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", getCostColor(model.cost))}
                    >
                      <DollarSign className="h-3 w-3 mr-1" />
                      {model.cost}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {(model.contextTokens / 1000).toFixed(0)}k context
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      {selectedModel && (
        <Card className="bg-muted/50 border-primary/20">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Selected:</span> {selectedModel.label} - {selectedModel.bestFor}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

