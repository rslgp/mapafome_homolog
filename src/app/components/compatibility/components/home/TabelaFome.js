import '../../App.css';
import './TabelaFome.css';
import { t, useLocale } from '../ux/strings';

function TabelaFome() {
  useLocale(); // re-render on locale change so t() re-reads

  return (
        <div>
            <table className="tf-table">
            <tbody>
            <tr className="tf-row--zebra">
            <th style={{"width":"7%"}}>{t('page.hungertable.hdr_time')}</th>
            <th style={{"width":"86%"}}>{t('page.hungertable.hdr_conseq')}</th>
            <th style={{"width":"7%"}}>{t('page.hungertable.hdr_risk')}</th>
            </tr>
            <tr>
            <td>{t('page.hungertable.time_0')}</td>
            <td>{t('page.hungertable.conseq_0')}</td>
            <td>{t('page.hungertable.risk_0')}</td>
            </tr>
            <tr className="tf-row--zebra">
            <td>{t('page.hungertable.time_1')}</td>
            <td className="tf-cell--desc">{t('page.hungertable.conseq_1')}</td>
            <td>{t('page.hungertable.risk_0')}</td>
            </tr>
            <tr>
            <td>{t('page.hungertable.time_2')}</td>
            <td className="tf-cell--desc">{t('page.hungertable.conseq_2')}</td>
            <td>{t('page.hungertable.risk_low')}</td>
            </tr>
            <tr className="tf-row--zebra">
            <td>{t('page.hungertable.time_3')}</td>
            <td className="tf-cell--desc">{t('page.hungertable.conseq_3')}</td>
            <td>{t('page.hungertable.risk_mod')}</td>
            </tr>
            <tr>
            <td>{t('page.hungertable.time_4')}</td>
            <td className="tf-cell--desc">{t('page.hungertable.conseq_4')}</td>
            <td>{t('page.hungertable.risk_mod')}</td>
            </tr>
            <tr className="tf-row--zebra">
            <td>{t('page.hungertable.time_5')}</td>
            <td className="tf-cell--desc">{t('page.hungertable.conseq_5')}</td>
            <td>{t('page.hungertable.risk_high')}</td>
            </tr>
            <tr>
            <td>{t('page.hungertable.time_6')}</td>
            <td className="tf-cell--desc">{t('page.hungertable.conseq_6')}</td>
            <td>{t('page.hungertable.risk_high')}</td>
            </tr>
            <tr className="tf-row--zebra">
            <td>{t('page.hungertable.time_7')}</td>
            <td className="tf-cell--desc">{t('page.hungertable.conseq_7')}</td>
            <td>{t('page.hungertable.risk_high')}</td>
            </tr>
            <tr>
            <td>{t('page.hungertable.time_8')}</td>
            <td className="tf-cell--desc">{t('page.hungertable.conseq_8')}</td>
            <td>{t('page.hungertable.risk_vhigh')}</td>
            </tr>
            <tr className="tf-row--zebra">
            <td>{t('page.hungertable.time_9')}</td>
            <td className="tf-cell--desc">{t('page.hungertable.conseq_9')}</td>
            <td>{t('page.hungertable.risk_xhigh')}</td>
            </tr>
            <tr>
            <td>{t('page.hungertable.time_10')}</td>
            <td className="tf-cell--desc">{t('page.hungertable.conseq_10')}</td>
            <td>{t('page.hungertable.risk_xhigh')}</td>
            </tr>
            </tbody>
            </table>
        </div>
  );
}

export default TabelaFome;
