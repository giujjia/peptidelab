import { Card, CardContent, Typography, List, ListItem, ListItemIcon, ListItemText, CardActions, Button } from '@mui/material';
import CircleIcon from '@mui/icons-material/Circle';
import { ToolCardProps } from '../../types';

export function ToolCard({ title, desc, features, btnLabel, btnVariant, accent, onClick }: ToolCardProps) {
  return (
    <Card 
      variant="outlined" 
      sx={{ 
        borderTop: 3,
        borderTopStyle: 'solid',
        borderColor: accent,
        borderRadius: 1.5,
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.5 }}>{desc}</Typography>
        <List dense disablePadding>
          {features.map((f: string) => (
            <ListItem key={f} disablePadding sx={{ mb: 1 }}>
              <ListItemIcon sx={{ minWidth: 20 }}>
                <CircleIcon sx={{ fontSize: 6, color: accent }} />
              </ListItemIcon>
              <ListItemText 
                primary={f} 
                primaryTypographyProps={{ fontSize: 12, color: "text.secondary" }} 
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          fullWidth
          variant={btnVariant}
          onClick={onClick}
        >
          {btnLabel}
        </Button>
      </CardActions>
    </Card>
  );
}
