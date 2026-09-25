import { Component, ErrorInfo, ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in UI:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger text-[20px] mb-3">
            <FontAwesomeIcon icon={faTriangleExclamation} fixedWidth />
          </div>
          <h2 className="text-[18px] leading-[24px] font-bold text-primary m-0">
            Something went wrong
          </h2>
          <p className="text-[14px] leading-[20px] text-muted max-w-[320px] mt-1 mb-4">
            An unexpected error occurred while rendering this view.
          </p>
          <Button variant="secondary" size="md" onClick={this.handleReset}>
            Reload page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
